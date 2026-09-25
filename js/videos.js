// The video catalogue.
// These are open movies from the Blender Foundation, released under the
// Creative Commons Attribution license, so they are free to show with credit.
// To add a video, copy one block and change the values.

const BASE = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";

export const videos = [
  {
    id: "big-buck-bunny",
    title: "Big Buck Bunny",
    creator: "Blender Foundation",
    year: 2008,
    duration: "9:56",
    category: "Animation",
    license: "CC BY 3.0",
    src: `${BASE}/BigBuckBunny.mp4`,
    thumbnail: `${BASE}/images/BigBuckBunny.jpg`,
    description:
      "A giant rabbit with a heart bigger than himself gets his revenge on three bullying rodents. A comedy short made entirely with open-source software.",
  },
  {
    id: "elephants-dream",
    title: "Elephants Dream",
    creator: "Blender Foundation",
    year: 2006,
    duration: "10:53",
    category: "Sci-Fi",
    license: "CC BY 2.5",
    src: `${BASE}/ElephantsDream.mp4`,
    thumbnail: `${BASE}/images/ElephantsDream.jpg`,
    description:
      "Two characters explore a strange, endless machine. The world's first open movie, made to show what open-source 3D tools can do.",
  },
  {
    id: "sintel",
    title: "Sintel",
    creator: "Blender Foundation",
    year: 2010,
    duration: "14:48",
    category: "Fantasy",
    license: "CC BY 3.0",
    src: `${BASE}/Sintel.mp4`,
    thumbnail: `${BASE}/images/Sintel.jpg`,
    description:
      "A lonely young woman searches for the baby dragon she once rescued. An emotional fantasy adventure.",
  },
  {
    id: "tears-of-steel",
    title: "Tears of Steel",
    creator: "Blender Foundation",
    year: 2012,
    duration: "12:14",
    category: "Sci-Fi",
    license: "CC BY 3.0",
    src: `${BASE}/TearsOfSteel.mp4`,
    thumbnail: `${BASE}/images/TearsOfSteel.jpg`,
    description:
      "In a future Amsterdam, a group of scientists try to save the world from destructive robots. Live action mixed with visual effects.",
  },
];

export const categories = ["All", ...new Set(videos.map((v) => v.category))];

export function findVideo(id) {
  return videos.find((v) => v.id === id);
}
