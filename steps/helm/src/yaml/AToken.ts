
export abstract class AToken {
    abstract write(): string;
    abstract get(key: any): AToken|any;
}