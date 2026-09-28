// Provide the shared page shell and content layout.
export function PageLayout({ navigation, children, dashboard = false }) {
  return <>{navigation}<main className={`page-shell ${dashboard ? 'dashboard-shell' : ''}`} id="main-content">{children}</main></>
}
