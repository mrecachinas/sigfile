import { BlueHeader, BlueFileReader } from './bluefile';
import { MatHeader, MatFileReader } from './matfile';

export declare const bluefile: {
  BlueHeader: typeof BlueHeader;
  BlueFileReader: typeof BlueFileReader;
};

export declare const matfile: {
  MatHeader: typeof MatHeader;
  MatFileReader: typeof MatFileReader;
};

export declare const version: string;
