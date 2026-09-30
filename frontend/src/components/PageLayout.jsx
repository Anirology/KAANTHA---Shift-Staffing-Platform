// Provide the shared page shell and content layout.
export function PageLayout({ navigation, children, dashboard = false }) {
  // Share navigation and the main landmark while allowing dashboard-specific page sizing.
  return <>{navigation}<main className={`page-shell ${dashboard ? 'dashboard-shell' : ''}`} id="main-content">{children}</main></>
}
