declare module 'lunar-javascript' {
  interface EightChar {
    setSect(sect: number): void;
    getYear(): string;
    getMonth(): string;
    getDay(): string;
    getTime(): string;
  }

  interface Lunar {
    getEightChar(): EightChar;
  }

  interface SolarInstance {
    getLunar(): Lunar;
  }

  export const Solar: {
    fromYmdHms(year: number, month: number, day: number, hour: number, minute: number, second: number): SolarInstance;
  };

  export const LunarUtil: {
    SHI_SHEN: Record<string, string>;
    ZHI_HIDE_GAN: Record<string, string[]>;
  };
}
