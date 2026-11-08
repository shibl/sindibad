import { pageUrl } from './content'
import { shots } from './shots'
import type { AProject } from './AContent'
import type { DetailSlide } from './DetailSlides'

export function projectSlides(project: AProject, arabic: boolean): DetailSlide[] {
  const poster = pageUrl('media/sindibad-yasmina-poster.jpg')
  if (project.kind === 'game') return [
    {
      id: 'voyage', title: arabic ? 'المغامرة' : 'The adventure',
      body: project.details, image: poster,
    },
    {
      id: 'curriculum', title: arabic ? 'المنهاج السوري' : 'The Syrian curriculum',
      body: arabic
        ? 'تتحوّل دروس المنهاج السوري إلى تحدّيات قابلة للعب. يتعلّم الطالب عبر التجربة وحلّ الألغاز، خطوة بعد أخرى.'
        : 'Lessons from the Syrian curriculum become playable challenges. Students learn by trying, solving puzzles and making discoveries, one step at a time.',
      image: shots.lesson, portrait: true,
    },
    {
      id: 'islands', title: arabic ? 'عالم من الجزر' : 'A world of islands',
      body: arabic
        ? 'كل جزيرة تفتح باباً لمادة دراسية جديدة. اختر وجهتك على الخريطة، واستكشف، وتقدّم في رحلتك عبر التعلّم.'
        : 'Each island opens a door to a school subject. Choose a destination on the map, explore its world and move your learning journey forward.',
      image: shots.map, portrait: true,
    },
    {
      id: 'stories', title: arabic ? 'حكايات وشخصيات' : 'Stories & characters',
      body: arabic
        ? 'رافق ياسمينة ودليلها الهدهد، وتعرّف على شخصيات تمنح الدروس معنى ومكاناً في الحكاية.'
        : 'Travel with Yasmina and her hoopoe guide. Meet characters who give each lesson a sense of place and a part in the story.',
      image: shots.dialogue, portrait: true,
    },
    {
      id: 'gameplay', title: arabic ? 'داخل اللعبة' : 'See it in play',
      body: arabic
        ? 'شاهد الخريطة واستكشاف جزيرة الحروف من اللعبة نفسها، ثم ابدأ مغامرتك.'
        : 'Watch the island map and Letters Island exploration, captured from the game. Then start your own adventure.',
      image: poster, video: pageUrl('media/sindibad-yasmina-gameplay.mp4'), portrait: true,
    },
  ]

  return [
    { id: 'about', title: arabic ? 'الفكرة' : 'The idea', body: project.details, tone: project.kind, },
    { id: 'discover', title: arabic ? 'تعلّم بالتجربة' : 'Learn by exploring',
      body: project.kind === 'chemistry'
        ? (arabic ? 'نبني مساحة تدعو إلى التساؤل وتجريب الأفكار واستكشاف المواد وتفاعلاتها.' : 'We’re building a space to ask questions, try ideas and explore substances and their reactions.')
        : (arabic ? 'نبني مساحة تجعل الحركة والطاقة والظواهر اليومية مفاهيم يمكن استكشافها باللعب.' : 'We’re building a space to explore motion, energy and everyday phenomena through play.'),
      tone: project.kind },
    { id: 'soon', title: arabic ? 'قريباً' : 'Coming soon',
      body: arabic ? 'المشروع قيد التطوير. تواصل معنا لمعرفة المزيد عمّا نصنعه.' : 'This project is in development. Get in touch to learn more about what we’re making.',
      tone: project.kind },
  ]
}
