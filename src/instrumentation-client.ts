const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

const banner = `
   ____  _    _ _ _ _
  / ___|| | _(_) | | |__   __ _ ___  ___
  \\___ \\| |/ / | | | '_ \\ / _\` / __|/ _ \\
   ___) |   <| | | | |_) | (_| \\__ \\  __/
  |____/|_|\\_\\_|_|_|_.__/ \\__,_|___/\\___|
`;

console.log(
  `%c${banner}%c  v${version}  ·  a library of reusable AI skills`,
  "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #0f172a; font-weight: 600;",
  "font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #64748b;",
);
