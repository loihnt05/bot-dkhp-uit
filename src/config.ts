export const defaultConfig: DKHPConfig = {
  username: "username",
  password: "password",
  classes: [],
  timer: false,
  startTime: "2024-08-15T16:30:00",
};

export interface DKHPConfig {
  username: string;
  password: string;
  classes: Array<string>;
  timer?: boolean; // if true, the script will wait until startTime to start
  startTime?: string; // ISO 8601 format time
}
