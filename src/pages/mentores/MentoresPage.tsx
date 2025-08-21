import { useEffect } from "react"
import Header from "../../components/layout/Header"
import "../../styles/mentores/dashboard.css"
import MentoresTable from "../../components/mentores/MentoresTable"

export default function MentoresPage() {
  useEffect(() => {
    document.body.classList.remove("login-bg")
    document.body.classList.add("no-scroll")
    return () => document.body.classList.remove("no-scroll")
  }, [])

  return (
    <div className="mentores-dashboard">
      <Header />

      <div className="page-title">
        <h1>Mentores</h1>
      </div>

      <div className="mentores-table-wrapper" style={{ paddingTop: 24 }}>
        <MentoresTable />
      </div>

      <img
        src="/images/dashboard.png"
        alt=""
        className="dashboard-center-image"
        draggable={false}
      />
    </div>
  )
}
