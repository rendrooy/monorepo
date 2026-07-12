"use client";

import { useApiService } from "@/hooks";
import { getAccessToken } from "@/utils/auth-storage";
import type { UmkmAdInterface } from "@monorepo/types";
import { Button } from "@monorepo/ui/components/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@monorepo/ui/components/carousel";
import { ExternalLink, MapPin, MessageCircle, Store } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

function safeExternalUrl(value?: string | null) {
    if (!value) return null;
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
    } catch {
        return null;
    }
}

function AdImage({ revisionId, name }: Readonly<{ revisionId?: string | null; name?: string | null }>) {
    const [imageUrl, setImageUrl] = useState("");
    useEffect(() => {
        if (!revisionId) return;
        let objectUrl = "";
        fetch(`http://localhost:3001/v1/umkm/revision/${revisionId}/image`, {
            headers: { Authorization: `Bearer ${getAccessToken()}` },
        }).then(response => response.ok ? response.blob() : Promise.reject())
            .then(blob => { objectUrl = URL.createObjectURL(blob); setImageUrl(objectUrl); })
            .catch(() => setImageUrl(""));
        return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [revisionId]);
    return <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
        {imageUrl ? <Image src={imageUrl} alt={name || "Iklan UMKM"} fill unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center"><Store className="h-10 w-10 text-slate-300" /></div>}
    </div>;
}

export function UmkmAdsCarousel() {
    const [ads, setAds] = useState<UmkmAdInterface[]>([]);
    const { callApi, loading } = useApiService("loadActiveUmkmAds");
    useEffect(() => { callApi({}, { onSuccess: response => setAds(response.data || []) }); }, [callApi]);
    if (loading) return <section><div className="mb-4 h-6 w-44 animate-pulse rounded bg-slate-100" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map(item => <div key={item} className="h-72 animate-pulse rounded-md bg-slate-100" />)}</div></section>;
    if (!ads.length) return null;
    return <section className="space-y-4">
        <div><h2 className="text-lg font-semibold text-slate-900">UMKM Warga</h2><p className="mt-1 text-sm text-slate-500">Produk dan layanan dari lingkungan sekitar.</p></div>
        <Carousel opts={{ align: "start", loop: ads.length > 3 }} className="px-1">
            <CarouselContent className="-ml-4">{ads.map(ad => {
                const externalUrl = safeExternalUrl(ad.external_url);
                const whatsapp = (ad.whatsapp || "").replace(/\D/g, "");
                return <CarouselItem key={ad.subscription_id} className="basis-full pl-4 md:basis-1/2 xl:basis-1/3">
                    <article className="h-full overflow-hidden rounded-md border border-slate-200 bg-white">
                        <AdImage revisionId={ad.revision_id} name={ad.name} />
                        <div className="space-y-3 p-4"><div><span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{ad.category_label}</span><h3 className="mt-2 text-lg font-semibold text-slate-900">{ad.name}</h3></div><p className="line-clamp-2 min-h-10 text-sm text-slate-600">{ad.description}</p><div className="flex items-start gap-2 text-xs text-slate-500"><MapPin className="mt-0.5 h-3.5 w-3.5 flex-none" /><span className="line-clamp-2">{ad.address}</span></div><div className="flex flex-wrap gap-2">{whatsapp ? <Button size="sm" asChild><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a></Button> : null}{externalUrl ? <Button size="sm" variant="outline" asChild><a href={externalUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Kunjungi</a></Button> : null}</div></div>
                    </article>
                </CarouselItem>;
            })}</CarouselContent>
            {ads.length > 1 ? <><CarouselPrevious className="left-2 top-36" /><CarouselNext className="right-2 top-36" /></> : null}
        </Carousel>
    </section>;
}
