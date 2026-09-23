export function PageLayout({ navigation, children }) {
  return <>{navigation}<main className="page-shell" id="main-content">{children}</main></>
}
