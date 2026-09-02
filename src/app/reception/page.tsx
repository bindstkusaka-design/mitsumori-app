import { cookies } from 'next/headers'
import { RECEPTION_COOKIE_NAME, verifyReceptionToken } from '@/lib/reception-auth'
import ReceptionLoginForm from './ReceptionLoginForm'
import ReceptionCustomersClient from './ReceptionCustomersClient'

// このページ自体はSupabase/ストアに一切アクセスしない。
// 認証済みの場合のみ、顧客データを扱うクライアントコンポーネントを描画する。
export default async function ReceptionPage() {
  const token = cookies().get(RECEPTION_COOKIE_NAME)?.value
  const authed = await verifyReceptionToken(token)

  return authed ? <ReceptionCustomersClient /> : <ReceptionLoginForm />
}
