import { NotificationsList } from '@/components/NotificationsList'

export default function Notifications() {
  return (
    <>
      <div className="comp" style={{ paddingBottom: 0, border: 0 }}><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Notifications</h2></div>
      <NotificationsList />
    </>
  )
}
