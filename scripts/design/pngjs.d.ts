/** `pngjs`(devDependency, 타입 패키지 없음)에서 아이콘 생성기가 쓰는 부분만 적은 선언 */
declare module "pngjs" {
  export class PNG {
    constructor(options?: { width: number; height: number });
    width: number;
    height: number;
    data: Buffer;
    static sync: {
      read(buffer: Buffer): PNG;
      write(png: PNG, options?: { colorType?: number; inputColorType?: number }): Buffer;
    };
  }
}
