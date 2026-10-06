import Image from "next/image";

export default function SubpageBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0">
      <Image
        src="/other_tab_Bg_light_mode.png"
        alt="Celestial Subpage Background Light"
        fill
        priority
        unoptimized
        className="object-cover object-center opacity-20 dark:hidden"
      />
      <Image
        src="/other_tab_Bg_dark_mode.png"
        alt="Celestial Subpage Background Dark"
        fill
        priority
        unoptimized
        className="object-cover object-center opacity-8 hidden dark:block"
      />
    </div>
  );
}
