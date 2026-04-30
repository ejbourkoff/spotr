import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  const hash = (pw: string) => bcrypt.hash(pw, 10)

  // ── Athletes ──────────────────────────────────────────────────────────────
  const jalenUser = await prisma.user.create({
    data: {
      email: 'jalen@spotr.com',
      password: await hash('password123'),
      role: 'ATHLETE',
      athleteProfile: {
        create: {
          name: 'Jalen Carter',
          sport: 'Basketball',
          position: 'Point Guard',
          schoolTeam: 'Duke Blue Devils',
          classYear: 'Sophomore',
          location: 'Durham, NC',
          height: "6'1\"",
          weight: 185,
          bio: "Building my game every day. Point guard with a passion for creating plays. Open to NIL deals that align with my brand.",
          openToNIL: true,
          openToSemiProPro: false,
          stats: {
            create: [
              { season: '2024-25', statType: 'PPG', value: 22.4 },
              { season: '2024-25', statType: 'APG', value: 7.1 },
              { season: '2024-25', statType: 'RPG', value: 4.2 },
              { season: '2024-25', statType: 'FG%', value: 47.3 },
            ],
          },
        },
      },
    },
    include: { athleteProfile: true },
  })

  const miaUser = await prisma.user.create({
    data: {
      email: 'mia@spotr.com',
      password: await hash('password123'),
      role: 'ATHLETE',
      athleteProfile: {
        create: {
          name: 'Mia Torres',
          sport: 'Soccer',
          position: 'Forward',
          schoolTeam: 'Stanford Cardinal',
          classYear: 'Junior',
          location: 'Palo Alto, CA',
          height: "5'7\"",
          weight: 140,
          bio: "Stanford soccer forward. 2x All-Pac-12. Passionate about women's sports advocacy and brand partnerships.",
          openToNIL: true,
          openToSemiProPro: true,
          stats: {
            create: [
              { season: '2024-25', statType: 'Goals', value: 18 },
              { season: '2024-25', statType: 'Assists', value: 9 },
              { season: '2024-25', statType: 'Shots on Goal', value: 42 },
            ],
          },
        },
      },
    },
    include: { athleteProfile: true },
  })

  const demarcoUser = await prisma.user.create({
    data: {
      email: 'demarco@spotr.com',
      password: await hash('password123'),
      role: 'ATHLETE',
      athleteProfile: {
        create: {
          name: 'DeMarco Williams',
          sport: 'Football',
          position: 'Wide Receiver',
          schoolTeam: 'Alabama Crimson Tide',
          classYear: 'Senior',
          location: 'Tuscaloosa, AL',
          height: "6'2\"",
          weight: 205,
          bio: "Senior WR at Alabama. Pro day ready. Looking for the right NIL deals before the draft.",
          openToNIL: true,
          openToSemiProPro: true,
          stats: {
            create: [
              { season: '2024-25', statType: 'Receptions', value: 74 },
              { season: '2024-25', statType: 'Yards', value: 1140 },
              { season: '2024-25', statType: 'Touchdowns', value: 11 },
              { season: '2024-25', statType: 'YPR', value: 15.4 },
            ],
          },
        },
      },
    },
    include: { athleteProfile: true },
  })

  // ── Coach ─────────────────────────────────────────────────────────────────
  const coachUser = await prisma.user.create({
    data: {
      email: 'coach@spotr.com',
      password: await hash('password123'),
      role: 'COACH',
      coachProfile: {
        create: {
          name: 'Coach Mike Reynolds',
          organization: 'Duke University',
          title: 'Assistant Coach, Men\'s Basketball',
          location: 'Durham, NC',
        },
      },
    },
    include: { coachProfile: true },
  })

  // ── Brand ─────────────────────────────────────────────────────────────────
  const brandUser = await prisma.user.create({
    data: {
      email: 'brand@spotr.com',
      password: await hash('password123'),
      role: 'BRAND',
      brandProfile: {
        create: {
          name: 'Apex Athletics',
          organizationType: 'Brand',
          location: 'Los Angeles, CA',
        },
      },
    },
    include: { brandProfile: true },
  })

  // ── Follows ───────────────────────────────────────────────────────────────
  const athleteIds = [jalenUser.id, miaUser.id, demarcoUser.id]
  for (const athleteId of athleteIds) {
    await prisma.follow.create({ data: { followerId: coachUser.id, followingId: athleteId } })
    await prisma.follow.create({ data: { followerId: brandUser.id, followingId: athleteId } })
  }
  // Athletes follow each other
  await prisma.follow.create({ data: { followerId: jalenUser.id, followingId: miaUser.id } })
  await prisma.follow.create({ data: { followerId: jalenUser.id, followingId: demarcoUser.id } })
  await prisma.follow.create({ data: { followerId: miaUser.id, followingId: jalenUser.id } })
  await prisma.follow.create({ data: { followerId: demarcoUser.id, followingId: jalenUser.id } })

  // ── Posts ─────────────────────────────────────────────────────────────────
  const post1 = await prisma.post.create({
    data: {
      authorId: jalenUser.id,
      text: 'Film session locked in this morning. Breaking down our next opponent\'s defense — every edge counts at this level. 🏀',
      mediaUrl: 'https://images.unsplash.com/photo-1546519638405-a2b2e3d77e4c?w=800',
      mediaType: 'photo',
      isReel: false,
    },
  })

  const post2 = await prisma.post.create({
    data: {
      authorId: miaUser.id,
      text: 'Back-to-back shutouts. The forwards are clicking and the midfield is a wall. Stanford soccer is built different this year.',
      mediaUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
      mediaType: 'photo',
      isReel: false,
    },
  })

  const post3 = await prisma.post.create({
    data: {
      authorId: demarcoUser.id,
      text: '74 catches. 1,140 yards. 11 TDs. Senior season recap — grateful for every rep. Pro day prep starts now.',
      mediaUrl: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800',
      mediaType: 'photo',
      isReel: false,
    },
  })

  const post4 = await prisma.post.create({
    data: {
      authorId: jalenUser.id,
      text: 'Morning grind never stops. 6am court work before anyone else is awake.',
    },
  })

  const post5 = await prisma.post.create({
    data: {
      authorId: miaUser.id,
      text: "Excited to announce I'm open to NIL opportunities! If your brand aligns with women's soccer and empowering young athletes — let's connect.",
    },
  })

  // Reels
  const reel1 = await prisma.post.create({
    data: {
      authorId: demarcoUser.id,
      text: 'Route running breakdown — every route tells a story 🏈',
      mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      mediaType: 'video',
      isReel: true,
    },
  })

  const reel2 = await prisma.post.create({
    data: {
      authorId: jalenUser.id,
      text: 'Behind the back to the scoop — full speed reps 🎯',
      mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      mediaType: 'video',
      isReel: true,
    },
  })

  // ── Likes ─────────────────────────────────────────────────────────────────
  const likeTargets = [post1.id, post2.id, post3.id, post5.id, reel1.id, reel2.id]
  const likers = [coachUser.id, brandUser.id, miaUser.id, demarcoUser.id, jalenUser.id]

  for (const postId of likeTargets) {
    for (const userId of likers.slice(0, 3)) {
      try {
        await prisma.like.create({ data: { userId, postId } })
      } catch {}
    }
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  await prisma.comment.create({ data: { userId: coachUser.id, postId: post1.id, text: 'Film work is what separates good from great. Keep it up, Jalen.' } })
  await prisma.comment.create({ data: { userId: miaUser.id, postId: post1.id, text: 'That lock-in mentality is contagious 🔥' } })
  await prisma.comment.create({ data: { userId: brandUser.id, postId: post2.id, text: 'Mia — Apex Athletics would love to connect about a potential partnership!' } })
  await prisma.comment.create({ data: { userId: jalenUser.id, postId: post3.id, text: 'Those numbers are crazy bro. NFL ready.' } })
  await prisma.comment.create({ data: { userId: coachUser.id, postId: post3.id, text: 'DeMarco has been one of the best WRs I\'ve scouted this season.' } })

  // ── NIL Offer ─────────────────────────────────────────────────────────────
  await prisma.offer.create({
    data: {
      brandId: brandUser.brandProfile!.id,
      athleteId: miaUser.athleteProfile!.id,
      deliverables: '3 Instagram posts, 2 TikToks, 1 in-store appearance',
      campaignStartDate: new Date('2025-02-01'),
      campaignEndDate: new Date('2025-04-30'),
      compensationAmount: 5000,
      notes: 'We love your story and your platform. Looking forward to partnering with you for our spring campaign.',
      status: 'PENDING',
    },
  })

  console.log('✅ Seed complete!')
  console.log('  Athletes: jalen@spotr.com, mia@spotr.com, demarco@spotr.com')
  console.log('  Coach:    coach@spotr.com')
  console.log('  Brand:    brand@spotr.com')
  console.log('  Password: password123 (all accounts)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
