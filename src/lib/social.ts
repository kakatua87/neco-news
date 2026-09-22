export type RedSocial = {
  key: string;
  url: string | undefined;
  path: string;
};

export const REDES: RedSocial[] = [
  {
    key: "instagram",
    url: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM,
    path: "M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z",
  },
  {
    key: "facebook",
    url: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
    path: "M15 3h-2a5 5 0 0 0-5 5v3H6v4h2v8h4v-8h3l1-4h-4V8a1 1 0 0 1 1-1h3z",
  },
  {
    key: "x",
    url: process.env.NEXT_PUBLIC_SOCIAL_X,
    path: "M4 4l7.5 8.5L4.5 20h2.3l6-6.8 5 6.8H21l-7.7-8.9L20 4h-2.3l-5.6 6.4L7.7 4Z",
  },
  {
    key: "youtube",
    url: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE,
    path: "M21.5 7.2a2.7 2.7 0 0 0-1.9-1.9C17.9 5 12 5 12 5s-5.9 0-7.6.3A2.7 2.7 0 0 0 2.5 7.2 27 27 0 0 0 2.2 12a27 27 0 0 0 .3 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.3 7.6.3 7.6.3s5.9 0 7.6-.3a2.7 2.7 0 0 0 1.9-1.9c.2-1.6.3-3.2.3-4.8a27 27 0 0 0-.3-4.8ZM10 15V9l5.2 3Z",
  },
];
