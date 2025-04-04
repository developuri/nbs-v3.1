export interface WordPressBlog {
  id: string;
  name: string;
  url: string;
  username: string;
  appPassword: string;
}

export interface WordPressBlogInput {
  name: string;
  url: string;
  username: string;
  appPassword: string;
} 