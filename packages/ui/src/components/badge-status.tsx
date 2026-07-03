import { Badge } from "./badge";

import {
    STATUS_PRESUBMITTED,
    STATUS_SUBMITTED,
    STATUS_ON_REVIEW,
    STATUS_BANK_REVIEW,
    STATUS_READY_TO_PROCESS,
    STATUS_OPEN,
    STATUS_RELEASED,
    STATUS_CREATE_CEMTEX,
    STATUS_PROCESS_CEMTEX,
    STATUS_DONE,
    STATUS_REJECTED_BY_SYSTEM,
    STATUS_REJECTED_BY_APPROVER_AGENCY,
    STATUS_REJECTED_BY_APPROVER_BANK,
    STATUS_REJECTED_BY_OPERATIONAL_BANK,
    STATUS_CLOSED,
    STATUS_FAILED,
} from "../constant/Status";

type StatusConfig = {
    label: string;
    style: string;
};

const STATUS_CONFIG: Record<string, StatusConfig> = {
    [STATUS_PRESUBMITTED]: {
        label: "Pre Submitted",
        style: "bg-slate-100 text-slate-700 border border-slate-700",
    },

    [STATUS_SUBMITTED]: {
        label: "Submitted",
        style: "bg-slate-100 text-slate-700 border border-slate-700",
    },

    [STATUS_ON_REVIEW]: {
        label: "On Review",
        style: "bg-blue-100 text-blue-700 border border-blue-700",
    },

    [STATUS_BANK_REVIEW]: {
        label: "Bank Review",
        style: "bg-purple-100 text-purple-700 border border-purple-700",
    },
    [STATUS_READY_TO_PROCESS]: {
        label: "Ready To Process",
        style: "bg-[#FFF3E0] text-[#F79009] border border-[#F79009]",
    },

    [STATUS_OPEN]: {
        label: "Open",
        style: "bg-yellow-100 text-yellow-700 border border-yellow-700",
    },

    [STATUS_RELEASED]: {
        label: "Released",
        style: "bg-yellow-100 text-yellow-700 border border-yellow-700",
    },

    [STATUS_CREATE_CEMTEX]: {
        label: "Create Cemtex",
        style: "bg-yellow-100 text-yellow-700 border border-yellow-700",
    },

    [STATUS_PROCESS_CEMTEX]: {
        label: "Process Cemtex",
        style: "bg-yellow-100 text-yellow-700 border border-yellow-700",
    },

    [STATUS_DONE]: {
        label: "Done",
        style: "bg-green-100 text-green-700 border border-green-700",
    },

    [STATUS_REJECTED_BY_SYSTEM]: {
        label: "Rejected By System",
        style: "bg-red-100 text-red-700 border border-red-700",
    },

    [STATUS_REJECTED_BY_APPROVER_AGENCY]: {
        label: "Rejected By Approver Agency",
        style: "bg-red-100 text-red-700 border border-red-700",
    },

    [STATUS_REJECTED_BY_APPROVER_BANK]: {
        label: "Rejected By Approver Bank",
        style: "bg-red-100 text-red-700 border border-red-700",
    },

    [STATUS_REJECTED_BY_OPERATIONAL_BANK]: {
        label: "Rejected By Operational Bank",
        style: "bg-red-100 text-red-700 border border-red-700",
    },

    [STATUS_CLOSED]: {
        label: "Closed",
        style: "bg-gray-200 text-gray-700 border border-gray-400",
    },

    [STATUS_FAILED]: {
        label: "Failed",
        style: "bg-red-200 text-red-800 border border-red-800",
    },
};

const DEFAULT_STATUS_STYLE =
    "bg-slate-100 text-slate-700 border border-slate-300";

export const renderStatusBadge = (statusCode: string, statusDesc: string) => {
    const config = STATUS_CONFIG[statusCode];

    const formattedDesc = statusDesc
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    if (!config) {
        return <Badge className={DEFAULT_STATUS_STYLE}>{formattedDesc}</Badge>;
    }

    return <Badge className={config.style}>{formattedDesc}</Badge>;
};
