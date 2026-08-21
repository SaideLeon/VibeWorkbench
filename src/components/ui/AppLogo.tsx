'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  subtitle?: string;
  className?: string;
}

export const AppLogo = ({
  size = 'md',
  showText = true,
  subtitle,
  className = '',
}: AppLogoProps) => {
  const [imgSrc, setImgSrc] = useState<string>('/logotipo.png');

  const sizeMap = {
    sm: { container: 'w-7 h-7', img: 28, text: 'text-sm', sub: 'text-[9px]' },
    md: { container: 'w-8 h-8', img: 32, text: 'text-base', sub: 'text-[10px]' },
    lg: { container: 'w-10 h-10', img: 40, text: 'text-lg', sub: 'text-xs' },
    xl: { container: 'w-14 h-14', img: 56, text: 'text-xl', sub: 'text-xs' },
  };

  const conf = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${conf.container} rounded-xl overflow-hidden shadow-lg shadow-blue-500/25 border border-blue-500/20 shrink-0 bg-[#070b14] flex items-center justify-center p-0.5`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt="Mitigar IA Logo"
          width={conf.img}
          height={conf.img}
          className="w-full h-full object-contain drop-shadow-sm"
          onError={() => {
            if (imgSrc === '/logotipo.png') {
              setImgSrc('/logo.png');
            } else if (imgSrc === '/logo.png') {
              setImgSrc('/api/icon');
            }
          }}
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold ${conf.text} tracking-tight text-white leading-none`}>
            Mitigar IA
          </span>
          {subtitle && (
            <span className={`${conf.sub} text-gray-400 font-mono mt-0.5`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
