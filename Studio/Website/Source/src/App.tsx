import A from './A'
import { ContentContext, type Content } from './content'

export default function App(props: { content: Content }) {
  return (
    <ContentContext value={props.content}>
      <A />
    </ContentContext>
  )
}
