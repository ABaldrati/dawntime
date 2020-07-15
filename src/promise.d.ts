import Bluebird from "bluebird";

export {};

declare global { export interface Promise<T> extends Bluebird<T> {} }
