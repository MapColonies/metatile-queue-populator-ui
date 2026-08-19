declare module 'shpjs' {
  export default function shp(buffer: Buffer | ArrayBuffer): Promise<any>;
}

declare module 'wicket' {
  export class Wkt {
    public read(wktString: string): void;
    public toJson(): any;
  }
}
