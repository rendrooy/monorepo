import type { BaseRequest, UmkmInterface, UmkmReviewRequest } from "@monorepo/types";
import type { Request, Response } from "express";
import { build } from "./app-response";
import { getUmkmImageService, loadMyUmkmService, loadUmkmReviewService, reviewUmkmService, saveUmkmDraftService, setUmkmSuspendedService, submitUmkmService, UMKM_CATEGORIES } from "../services/umkm-service";

type Body<T> = Request<Record<string, never>, unknown, T>;
export const getUmkmCategories=async(_req:Request,res:Response)=>build(res,{status:200,message:"Request successful",data:UMKM_CATEGORIES});
export const loadMyUmkm=async(req:Body<BaseRequest<UmkmInterface>>,res:Response)=>build(res,await loadMyUmkmService(req.body));
export const saveUmkmDraft=async(req:Body<UmkmInterface>,res:Response)=>build(res,await saveUmkmDraftService(req.body));
export const submitUmkm=async(req:Body<UmkmInterface>,res:Response)=>build(res,await submitUmkmService(req.body.id));
export const suspendUmkm=async(req:Body<UmkmInterface>,res:Response)=>build(res,await setUmkmSuspendedService(req.body.id,true));
export const resumeUmkm=async(req:Body<UmkmInterface>,res:Response)=>build(res,await setUmkmSuspendedService(req.body.id,false));
export const loadUmkmReview=async(req:Body<BaseRequest<UmkmInterface>>,res:Response)=>build(res,await loadUmkmReviewService(req.body));
export const approveUmkm=async(req:Body<UmkmReviewRequest>,res:Response)=>build(res,await reviewUmkmService(req.body.id,true,req.body.note));
export const rejectUmkm=async(req:Body<UmkmReviewRequest>,res:Response)=>build(res,await reviewUmkmService(req.body.id,false,req.body.note));
export const getUmkmImage=async(req:Request<{id:string}>,res:Response)=>{const image=await getUmkmImageService(req.params.id);if(!image){res.status(404).json({status:404,message:"Gambar tidak ditemukan",data:null});return;}res.type(image.mime);res.setHeader("Content-Disposition",`inline; filename*=UTF-8''${encodeURIComponent(image.name)}`);res.send(image.body);};
