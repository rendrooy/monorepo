// import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
import { Button } from './button';

interface LoadingButtonProps {
    isLoading: boolean;
    loadingText?: string;
    children: ReactNode;
    className?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    type?: 'button' | 'submit' | 'reset';
    onClick?: () => void;
    disabled?: boolean;
    fullWidth?: boolean;
}

export function LoadingButton({
    isLoading,
    loadingText = 'Memproses...',
    children,
    className = '',
    variant = 'default',
    size = 'default',
    type = 'button',
    onClick,
    disabled = false,
    fullWidth = false,
}: LoadingButtonProps) {
    const getClassName = () => {
        let classes = 'relative';
        if (fullWidth) classes += ' w-full';
        if (className) classes += ' ' + className;
        return classes;
    };

    return (
        <Button
            type={type}
            className={getClassName()}
            variant={variant}
            size={size}
            onClick={onClick}
            disabled={disabled || isLoading}
        >
            {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                    {loadingText}
                </div>
            ) : (
                children
            )}
        </Button>
    );
}