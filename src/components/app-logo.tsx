import Image from 'next/image';

type Props = {
  logoSize?: number;     // big logo size
  showText?: boolean;
  className?: string;
  textClassName?: string;
};

export default function AppLogo({
  logoSize = 120,
  showText = true,
  className = '',
  textClassName = '',
}: Props) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <Image
        src="/brand/Logo.png"
        alt="Eco Solar Investment"
        width={logoSize}
        height={logoSize}
        className="object-contain"
        priority
      />

      {showText && (
        <div className={`mt-3 text-center ${textClassName}`}>
          <div className="text-3xl font-extrabold leading-none">
            Eco Solar Investment
          </div>
        </div>
      )}
    </div>
  );
}
