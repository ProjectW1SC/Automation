// Keep legacy browser requests on the same brand symbol selected in app/layout.jsx.
// No separate icon artwork or UI changes are introduced.
export function GET(request) {
  return Response.redirect(new URL('/branding/projectw1sc-symbol.svg', request.url), 308);
}
