"use client";

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2 } from 'lucide-react';

/* ============================= */
/* TYPES */
/* ============================= */

interface OTPVerificationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void | Promise<void>;
    email?: string;
    title?: string;
    description?: string;
    countdownSeconds?: number;
    confirmButtonText?: string;
}

interface OTPInputProps {
    length?: number;
    value: string;
    onChange: (otp: string) => void;
    onEnter?: () => void;
    disabled?: boolean;
    error?: string;
}

/* ============================= */
/* OTP INPUT COMPONENT */
/* ============================= */

function OTPInput({
    length = 6,
    value,
    onChange,
    onEnter,
    disabled = false,
    error,
}: Readonly<OTPInputProps>) {
    const otpArray = value.split('').slice(0, length);

    while (otpArray.length < length) {
        otpArray.push('');
    }

    const handleChange = (index: number, newValue: string) => {
        if (newValue.length > 1) return;

        const newOtp = [...otpArray];
        newOtp[index] = newValue;
        onChange(newOtp.join(''));

        // Auto-focus next input
        if (newValue && index < length - 1) {
            const nextInput = document.getElementById(`otp-verify-${index + 1}`);
            nextInput?.focus();
        }

        // Auto-focus previous input on backspace
        if (newValue === '' && index > 0) {
            const prevInput = document.getElementById(`otp-verify-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
            const prevInput = document.getElementById(`otp-verify-${index - 1}`);
            prevInput?.focus();
        }
        if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-center gap-3">
                {Array.from({ length }, (_, index) => (
                    <Input
                        key={`otp-verify-${index}`}
                        id={`otp-verify-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={otpArray[index] || ''}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-14 h-14 text-center text-2xl font-bold border-blue-300 focus:border-blue-500 focus:ring-blue-500"
                        autoFocus={index === 0}
                        disabled={disabled}
                    />
                ))}
            </div>
            {error && (
                <p className="text-red-500 text-xs text-center">{error}</p>
            )}
        </div>
    );
}

/* ============================= */
/* OTP VERIFICATION DIALOG */
/* ============================= */

export function OTPVerificationDialog({
    isOpen,
    onClose,
    onSuccess,
    email,
    title = "Verifikasi OTP",
    description = "Masukkan kode OTP 6 digit yang telah dikirimkan ke email",
    countdownSeconds = 30,
    confirmButtonText = "Verifikasi",
}: Readonly<OTPVerificationDialogProps>) {
    const initialCountdown = useRef(countdownSeconds).current;

    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(initialCountdown);
    const [canResend, setCanResend] = useState(false);
    const [isResending, setIsResending] = useState(false);

    // Reset state when dialog opens
    useEffect(() => {
        if (isOpen) {
            setOtp('');
            setError('');
            setResendTimer(initialCountdown);
            setCanResend(false);
        }
    }, [isOpen, initialCountdown]);

    // Countdown timer
    useEffect(() => {
        if (isOpen && resendTimer > 0) {
            const timer = setTimeout(() => {
                setResendTimer(resendTimer - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (resendTimer === 0) {
            setCanResend(true);
        }
    }, [resendTimer, isOpen]);

    const handleVerify = async () => {
        if (otp.length !== 6) {
            setError('Kode OTP harus 6 digit');
            return;
        }

        if (!email) {
            setError('Email tidak ditemukan. Silakan coba lagi.');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/validate-mfa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    otp: otp
                }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success('Verifikasi OTP berhasil');
                await onSuccess();
                onClose();
            } else {
                setError(result.message || 'Kode OTP salah. Silakan coba lagi.');
                setOtp('');
            }
        } catch (error) {
            console.error('OTP verification error:', error);
            setError('Terjadi kesalahan. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOTP = async () => {
        if (!canResend || isResending) return;

        setIsResending(true);
        try {
            const response = await fetch('/api/auth/resend-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email
                }),
            });

            const result = await response.json();

            if (response.ok) {
                toast.success('Kode OTP berhasil dikirim ulang');
                setCanResend(false);
                setResendTimer(initialCountdown);
                setOtp('');
                setError('');
            } else {
                toast.error(result.message || 'Gagal mengirim ulang OTP. Silakan coba lagi.');
            }
        } catch {
            toast.error('Gagal mengirim ulang OTP. Silakan coba lagi.');
        } finally {
            setIsResending(false);
        }
    };

    const maskEmail = (emailStr: string) => {
        const atIndex = emailStr.indexOf('@');
        if (atIndex === -1) return emailStr;

        const localPart = emailStr.substring(0, atIndex);
        const domain = emailStr.substring(atIndex);

        if (localPart.length <= 7) return emailStr;

        const first2 = localPart.substring(0, 2);
        const last5 = localPart.substring(localPart.length - 5);
        const mask = '*'.repeat(localPart.length - 7);

        return `${first2}${mask}${last5}${domain}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md">
                {/* Card matching AuthDialog design */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-10 lg:p-12">
                    {/* Title and Description */}
                    <div className="mb-8">
                        <h2 className="text-slate-900 mb-2 text-xl font-semibold">
                            {title}
                        </h2>
                        <p className="text-slate-600">
                            {description}
                            {email && (
                                <>
                                    {' '}
                                    <strong className="text-slate-900">
                                        {maskEmail(email)}
                                    </strong>
                                </>
                            )}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="space-y-6">
                        {/* Error message */}
                        {error && (
                            <div className="p-3 rounded-md bg-red-50 border border-red-200">
                                <p className="text-xs text-red-600 text-center">{error}</p>
                            </div>
                        )}

                        {/* Label Kode OTP with Timer */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-slate-700">Kode OTP</span>
                                <span className="text-sm font-medium text-blue-600">
                                    {`${String(Math.floor(resendTimer / 60)).padStart(2, '0')}:${String(resendTimer % 60).padStart(2, '0')}`}
                                </span>
                            </div>
                            
                            {/* OTP Input */}
                            <OTPInput
                                value={otp}
                                onChange={setOtp}
                                onEnter={handleVerify}
                                disabled={isLoading}
                                error={error}
                            />
                        </div>
                        
                        {/* Resend */}
                        {canResend && (
                            <div className="text-center">
                                <p className="text-slate-600 text-sm">
                                    Tidak menerima kode OTP?{' '}
                                    <button
                                        type="button"
                                        className={`inline-flex items-center gap-1.5 font-medium underline ${
                                            isResending 
                                                ? 'text-blue-400 cursor-not-allowed' 
                                                : 'text-blue-600 hover:text-blue-700 cursor-pointer'
                                        }`}
                                        onClick={handleResendOTP}
                                        disabled={isResending}
                                    >
                                        {isResending && (
                                            <svg
                                                className="animate-spin h-3.5 w-3.5 text-blue-400"
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                        )}
                                        Kirim ulang
                                    </button>
                                </p>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <Button
                                type="button"
                                onClick={onClose}
                                variant="outline"
                                className="flex-1 h-12"
                                disabled={isLoading}
                            >
                                Kembali
                            </Button>
                            <Button
                                type="button"
                                onClick={handleVerify}
                                disabled={otp.length !== 6 || isLoading}
                                className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 disabled:text-slate-500"
                            >
                                {isLoading && (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                )}
                                {confirmButtonText}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
