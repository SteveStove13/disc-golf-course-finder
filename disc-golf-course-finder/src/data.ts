export type Course = {
  id: number
  name: string
  city: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  rating: number
  holes: number
  description: string
  topPick: boolean
  mapUrl: string
}

export const COURSES: Course[] = [
  {
    id: 1,
    name: 'Riverside DGC',
    city: 'Washington, MO',
    difficulty: 'Beginner',
    rating: 4.4,
    holes: 18,
    description: 'Scenic fairways along the river with forgiving lines and short tees—great for new players.',
    topPick: true,
    mapUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3107.186!2d-91.020!3d38.558!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0:0x0!2zMzjCsDMzJzI4LjAiTiA5McKwMDEnMTIuMCJX!5e0!3m2!1sen!2sus!4v1710000000000',
  },
  {
    id: 2,
    name: 'Creve Coeur Lake Park DGC',
    city: 'Maryland Heights, MO',
    difficulty: 'Intermediate',
    rating: 4.6,
    holes: 18,
    description:
      'Lakeside winds, a mix of open and lightly wooded shots. Multiple pin placements keep it fresh.',
    topPick: true,
    mapUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3108.41!2d-90.477!3d38.710!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87df2d7a6a6d3e95:0x3c4d!2sCreve%20Coeur%20Lake%20Park!5e0!3m2!1sen!2sus!4v1710000000000',
  },
  {
    id: 3,
    name: 'Jefferson Barracks DGC',
    city: 'St. Louis, MO',
    difficulty: 'Advanced',
    rating: 4.7,
    holes: 18,
    description:
      'Historic park with elevation, woods, and technical angles. Demands placement and scramble game.',
    topPick: false,
    mapUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3099.71!2d-90.283!3d38.530!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87d8cbb9a3a7c08f:0x8d1a!2sJefferson%20Barracks%20Park!5e0!3m2!1sen!2sus!4v1710000000000',
  },
  {
    id: 4,
    name: 'Logan University DGC',
    city: 'Chesterfield, MO',
    difficulty: 'Intermediate',
    rating: 4.5,
    holes: 18,
    description:
      'Rolling hills and mowed fairways. Well-marked, friendly to improving players aiming for par golf.',
    topPick: false,
    mapUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3106.99!2d-90.551!3d38.592!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87df2d3e5e4a61ab:0x4a6d!2sLogan%20University!5e0!3m2!1sen!2sus!4v1710000000000',
  },
  {
    id: 5,
    name: 'Carrollton Park DGC',
    city: 'Bridgeton, MO',
    difficulty: 'Beginner',
    rating: 4.2,
    holes: 18,
    description:
      'Shorter layout with ace runs and learning-friendly gaps. Perfect for casual rounds and field work.',
    topPick: false,
    mapUrl:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3107.88!2d-90.421!3d38.622!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x87df2d4d2c4a3d0f:0x6e0!2sCarrollton%20Park!5e0!3m2!1sen!2sus!4v1710000000000',
  },
]
