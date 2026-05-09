"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function PageContent() {
  return (
    <div className="mt-6">
      <Card >
        <CardContent>
          <h1 className="text-2xl font-bold my-4">HomeHub</h1>
          <p className="text-gray-600">
            Selamat datang di dashboard Anda! Di sini Anda dapat melihat ringkasan aktivitas terbaru, mengelola pengaturan akun, dan mengakses fitur-fitur lainnya.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
