export function otpEmail({ code, purpose = "verify your email" }: { code: string; purpose?: string }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Your PIMX_ELTEX code</title></head>
<body style="margin:0;background:#090a0c;color:#f4f3ee;font-family:Arial,sans-serif;padding:32px 14px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#121317;border:1px solid #292a2f;border-radius:24px;overflow:hidden">
      <tr><td style="height:5px;background:linear-gradient(90deg,#7c5cff,#ff5c35)"></td></tr>
      <tr><td style="padding:42px 42px 18px"><div style="font-size:16px;font-weight:800;letter-spacing:-.5px">PIMX<span style="color:#ff5c35">_</span>ELTEX</div></td></tr>
      <tr><td style="padding:12px 42px 42px"><p style="margin:0 0 12px;color:#9e9da3;font-size:12px;text-transform:uppercase;letter-spacing:1.8px">Secure verification</p><h1 style="margin:0 0 18px;font-size:34px;line-height:1.1;letter-spacing:-1.5px">One quick step.</h1><p style="margin:0;color:#aaa9ae;font-size:15px;line-height:1.7">Use the code below to ${purpose}. It expires in 10 minutes and can only be used once.</p>
        <div style="margin:32px 0;padding:24px;text-align:center;background:#0b0c0f;border:1px solid #2d2f35;border-radius:16px;font:700 36px/1 monospace;letter-spacing:10px;color:#fff">${code}</div>
        <p style="margin:0;color:#737279;font-size:12px;line-height:1.6">If you did not request this code, you can safely ignore this email. Never share this code with anyone.</p>
      </td></tr>
      <tr><td style="padding:22px 42px;border-top:1px solid #24252a;color:#66676d;font-size:11px">Useful ideas, beautifully engineered.</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
