# Steering: Big File Upload Excel

Dokumen ini menjadi acuan implementasi fitur upload file Excel berukuran besar menggunakan **chunked upload** dan **streaming**.

## 1. Karakteristik file

- File merupakan daftar data transaksi.
- Satu baris mewakili satu transaksi.
- File dipilih dan di-upload sebagai satu file.
- Estimasi ukuran file adalah **500 MB sampai 1 GB**.
- File final disimpan ke **local path server**.
- Sistem tidak membutuhkan resume upload lintas sesi.

## 2. Strategi chunking

Chunk dibuat berdasarkan jumlah transaksi, bukan ukuran byte sembarang. Tujuannya agar satu transaksi tidak pernah terbagi ke dalam dua file chunk.

Ketentuan:

- Satu chunk normal berisi maksimal 90.000 transaksi.
- Satu chunk normal berukuran 49.590.000 byte.
- Chunk terakhir boleh lebih kecil.
- Upload dilakukan secara sequential.
- Jangan membaca seluruh file 500 MB–1 GB ke memory.
- Gunakan `File.slice()` berdasarkan byte offset.
- Jangan mengubah file menjadi string.
- Jangan mengubah encoding, padding, atau newline.

## 3. Validasi file di client

Validasi file sebelum memanggil API init:

```ts
if (file.size === 0) {
  throw new Error("File tidak boleh kosong");
}

if (file.size % RECORD_SIZE !== 0) {
  throw new Error(
    `Ukuran file tidak valid karena bukan kelipatan ${RECORD_SIZE} byte`,
  );
}
```

Hitung jumlah transaksi dan chunk:

```ts
const recordTotal = file.size / RECORD_SIZE;
const chunkTotal = Math.ceil(recordTotal / RECORDS_PER_CHUNK);
```

## 4. Kontrak API

Semua endpoint harus:

- Menggunakan method `POST`.
- Menggunakan URL statis.
- Tidak menggunakan path parameter.
- Tidak menggunakan query parameter.
- Mengirim metadata chunk melalui `FormData`, bukan custom header.

Endpoint:

```text
POST /api/upload/init
POST /api/upload/chunk
POST /api/upload/close
```

## 5. Init upload

Request:

```http
POST /api/upload/init
Content-Type: application/json
```

Body:

```json
{
  "fileNameOriginal": "transaction.sdd",
  "fileSize": 1000000000,
  "recordSize": 551,
  "recordTotal": 1814882,
  "recordsPerChunk": 90000,
  "chunkTotal": 21
}
```

Server harus:

1. Memvalidasi metadata.
2. Membuat `uploadId` yang unik.
3. Membuat temporary directory di local path.
4. Membuat manifest upload.
5. Menentukan nama file dan path secara aman.
6. Tidak menggunakan nama atau path mentah dari client sebagai filesystem path.

Response:

```json
{
  "uploadId": "01JXYZ123",
  "message": "Upload session berhasil dibuat"
}
```

Contoh manifest awal:

```json
{
  "uploadId": "01JXYZ123",
  "fileNameOriginal": "transaction.sdd",
  "fileSize": 1000000000,
  "recordSize": 551,
  "recordTotal": 1814882,
  "recordsPerChunk": 90000,
  "chunkTotal": 21,
  "status": "UPLOADING",
  "chunks": []
}
```

## 6. Upload chunk

Request:

```http
POST /api/upload/chunk
Content-Type: multipart/form-data
```

Field `FormData`:

```text
uploadId
chunkNumber
startTransaction
endTransaction
transactionTotal
chunkSize
sha256Checksum
file
```

Client tidak boleh mengatur header `Content-Type` secara manual. Browser harus membuat multipart boundary secara otomatis.

Contoh client:

```ts
const formData = new FormData();

formData.append("uploadId", uploadId);
formData.append("chunkNumber", chunkNumber.toString());
formData.append("startTransaction", startTransaction.toString());
formData.append("endTransaction", endTransaction.toString());
formData.append("transactionTotal", transactionTotal.toString());
formData.append("chunkSize", chunk.size.toString());
formData.append("sha256Checksum", checksum);
formData.append("file", chunk, `part-${chunkNumber}`);

await fetch("/api/upload/chunk", {
  method: "POST",
  body: formData,
});
```

## 7. Proses upload di client

Untuk setiap chunk:

1. Hitung posisi awal dan akhir berdasarkan `CHUNK_SIZE`.
2. Ambil chunk menggunakan `file.slice(start, end)`.
3. Generate SHA-256 chunk.
4. Kirim chunk menggunakan `FormData`.
5. Tunggu response sukses.
6. Lanjutkan ke chunk berikutnya.
7. Setelah seluruh chunk berhasil, panggil API close.

```ts
for (let chunkNumber = 0; chunkNumber < chunkTotal; chunkNumber++) {
  const start = chunkNumber * CHUNK_SIZE;
  const end = Math.min(start + CHUNK_SIZE, file.size);

  const chunk = file.slice(start, end);
  const checksum = await generateSHA256(chunk);

  await uploadChunk({
    uploadId,
    chunkNumber,
    chunk,
    checksum,
  });
}
```

Upload harus sequential. Jangan menjalankan semua chunk menggunakan `Promise.all()`.

## 8. Proses upload di server

Server harus:

1. Memvalidasi `uploadId`.
2. Memvalidasi `chunkNumber`.
3. Memastikan chunk belum tercatat.
4. Membuat nama chunk berdasarkan server, misalnya `part-000000`, `part-000001`, dan seterusnya.
5. Menerima multipart menggunakan parser yang mendukung stream.
6. Stream file langsung ke temporary local path.
7. Menghitung SHA-256 sambil menerima stream.
8. Menghitung jumlah byte aktual.
9. Membandingkan checksum server dengan checksum client.
10. Membandingkan ukuran aktual dengan `chunkSize`.
11. Memvalidasi ukuran chunk merupakan kelipatan 551 byte.
12. Rename file temporary menjadi nama chunk final jika valid.
13. Menambahkan informasi chunk ke manifest.

Jangan menggunakan memory buffering seperti:

```ts
multer.memoryStorage();
```

Gunakan streaming multipart parser atau disk storage yang tidak memuat seluruh chunk ke RAM.

Contoh data manifest chunk:

```json
{
  "filePartName": "part-000000",
  "chunkNumber": 0,
  "startTransaction": 1,
  "endTransaction": 90000,
  "transactionTotal": 90000,
  "fileSize": 49590000,
  "sha256Checksum": "abc123...",
  "status": "UPLOADED"
}
```

Manifest harus di-update secara aman menggunakan atomic write:

```text
manifest.json.tmp
→ rename
→ manifest.json
```

## 9. Close upload

Request:

```http
POST /api/upload/close
Content-Type: application/json
```

Body:

```json
{
  "uploadId": "01JXYZ123"
}
```

Server harus:

1. Membaca manifest berdasarkan `uploadId`.
2. Mengunci upload agar tidak menerima chunk baru.
3. Memastikan `chunkTotal` sesuai.
4. Memastikan seluruh chunk tersedia.
5. Memastikan urutan lengkap dari `0` sampai `chunkTotal - 1`.
6. Memastikan total transaksi sesuai `recordTotal`.
7. Memastikan total ukuran chunk sesuai `fileSize`.
8. Menghitung ulang SHA-256 setiap chunk.
9. Membandingkan checksum aktual dengan manifest.
10. Menggabungkan chunk berdasarkan `chunkNumber`.
11. Melakukan merge menggunakan stream.
12. Menghitung ukuran file final.
13. Memastikan ukuran file final sama dengan file asli.
14. Menyimpan hasil awal sebagai temporary final file.
15. Rename secara atomik menjadi file final.
16. Mengubah status manifest menjadi `COMPLETED`.
17. Menghapus chunk hanya setelah file final berhasil divalidasi.

Response:

```json
{
  "uploadId": "01JXYZ123",
  "fileNameOriginal": "transaction.sdd",
  "fileSize": 1000000000,
  "recordTotal": 1814882,
  "status": "COMPLETED",
  "message": "File berhasil disatukan"
}
```

## 10. Penanganan kegagalan

Tidak ada fitur resume lintas sesi.

- Chunk yang gagal boleh langsung di-retry dalam proses upload aktif.
- Jangan lanjut ke chunk berikutnya sebelum chunk aktif berhasil.
- Jika proses dibatalkan permanen, hapus temporary directory dan manifest.
- Buat cleanup untuk session `UPLOADING` yang kedaluwarsa.
- Jangan hapus chunk sebelum proses merge dan validasi final berhasil.
- Jika close gagal, file final temporary tidak boleh dianggap sebagai file valid.

## 11. Batas request

Untuk chunk sebesar 49.590.000 byte, konfigurasi multipart dan reverse proxy harus memberi ruang untuk overhead `FormData`.

```text
Maximum multipart file size : 55 MiB
Reverse proxy body limit    : 60 MiB
Request timeout             : 300 detik
```

## 12. Ringkasan keputusan final

```text
Ukuran satu transaksi : 551 byte, termasuk newline
Isi satu chunk normal : 90.000 transaksi
Ukuran chunk normal   : 49.590.000 byte (~47,29 MiB)
Metode upload         : sequential chunked upload
Request chunk         : multipart/form-data
Penyimpanan           : streaming ke local path
Validasi              : SHA-256 per chunk oleh client dan server
Finalisasi            : validasi ulang lalu stream merge
Resume lintas sesi    : tidak tersedia
```

Jangan mengubah desain menjadi single-request upload, parallel upload, Base64 upload, upload berbasis string, atau in-memory buffering.
