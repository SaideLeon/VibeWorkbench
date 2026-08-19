import Image from 'next/image';
import logoImg from '@/assets/images/vibe_workbench_logo_1786895338740.jpg';

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
  const sizeMap = {
    sm: { container: 'w-7 h-7', img: 28, text: 'text-sm', sub: 'text-[9px]' },
    md: { container: 'w-8 h-8', img: 32, text: 'text-base', sub: 'text-[10px]' },
    lg: { container: 'w-10 h-10', img: 40, text: 'text-lg', sub: 'text-xs' },
    xl: { container: 'w-14 h-14', img: 56, text: 'text-xl', sub: 'text-xs' },
  };

  const conf = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${conf.container} rounded-xl overflow-hidden shadow-md shadow-indigo-500/20 border border-white/10 shrink-0 bg-[#0d0d12]`}>
        <Image
          src={logoImg}
          alt="Vibe Workbench Logo"
          width={conf.img}
          height={conf.img}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          priority
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold ${conf.text} tracking-tight text-white leading-none`}>
            Vibe Workbench
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
