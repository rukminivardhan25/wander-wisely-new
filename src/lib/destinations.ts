/**
 * Explore destinations – curated list with history-focused places.
 * Images: location-relevant photos from Wikimedia Commons (Wikipedia REST API).
 * Fallback: Picsum for destinations without a curated image.
 */

export type DestinationCategory =
  | "History"
  | "Spiritual"
  | "Cities"
  | "Nature"
  | "Mountains"
  | "Beaches"
  | "Adventure";

export type Destination = {
  id: string;
  name: string;
  category: DestinationCategory;
  rating: number;
  shortDescription: string;
  about: string;
  /** First image used as hero/card; all used in gallery */
  images: string[];
};

/** Location-relevant images from Wikimedia Commons (one primary, repeated for gallery). */
const DESTINATION_IMAGES: Record<string, string[]> = {
  "angkor-wat": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff5%2FBuddhist_monks_in_front_of_the_Angkor_Wat.jpg%2F800px-Buddhist_monks_in_front_of_the_Angkor_Wat.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F41%2FAngkor_Wat.jpg%2F800px-Angkor_Wat.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff5%2FBuddhist_monks_in_front_of_the_Angkor_Wat.jpg%2F800px-Buddhist_monks_in_front_of_the_Angkor_Wat.jpg",
  ],
  "machu-picchu": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fbb%2FMachu_Picchu%252C_2023_%2528012%2529.jpg%2F800px-Machu_Picchu%252C_2023_%2528012%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fbb%2FMachu_Picchu%252C_2023_%2528012%2529.jpg%2F800px-Machu_Picchu%252C_2023_%2528012%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fbb%2FMachu_Picchu%252C_2023_%2528012%2529.jpg%2F800px-Machu_Picchu%252C_2023_%2528012%2529.jpg",
  ],
  petra: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fe%2Fe8%2FAl_Deir_Petra.JPG%2F800px-Al_Deir_Petra.JPG",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fe%2Fe8%2FAl_Deir_Petra.JPG%2F800px-Al_Deir_Petra.JPG",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fe%2Fe8%2FAl_Deir_Petra.JPG%2F800px-Al_Deir_Petra.JPG",
  ],
  colosseum: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fde%2FColosseo_2020.jpg%2F800px-Colosseo_2020.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fde%2FColosseo_2020.jpg%2F800px-Colosseo_2020.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fde%2FColosseo_2020.jpg%2F800px-Colosseo_2020.jpg",
  ],
  acropolis: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F7b%2FThe_Acropolis_of_Athens_on_June_1%252C_2021.jpg%2F800px-The_Acropolis_of_Athens_on_June_1%252C_2021.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F7b%2FThe_Acropolis_of_Athens_on_June_1%252C_2021.jpg%2F800px-The_Acropolis_of_Athens_on_June_1%252C_2021.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F7b%2FThe_Acropolis_of_Athens_on_June_1%252C_2021.jpg%2F800px-The_Acropolis_of_Athens_on_June_1%252C_2021.jpg",
  ],
  pompeii: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fd4%2FTheathres_of_Pompeii.jpg%2F800px-Theathres_of_Pompeii.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fd4%2FTheathres_of_Pompeii.jpg%2F800px-Theathres_of_Pompeii.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fd4%2FTheathres_of_Pompeii.jpg%2F800px-Theathres_of_Pompeii.jpg",
  ],
  kyoto: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F3c%2FKiyomizu.jpg%2F800px-Kiyomizu.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F3c%2FKiyomizu.jpg%2F800px-Kiyomizu.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F3c%2FKiyomizu.jpg%2F800px-Kiyomizu.jpg",
  ],
  varanasi: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F0%2F0e%2FVaranasi%252C_India%252C_Ghats%252C_Cremation_ceremony_in_progress.jpg%2F800px-Varanasi%252C_India%252C_Ghats%252C_Cremation_ceremony_in_progress.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F0%2F0e%2FVaranasi%252C_India%252C_Ghats%252C_Cremation_ceremony_in_progress.jpg%2F800px-Varanasi%252C_India%252C_Ghats%252C_Cremation_ceremony_in_progress.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F0%2F0e%2FVaranasi%252C_India%252C_Ghats%252C_Cremation_ceremony_in_progress.jpg%2F800px-Varanasi%252C_India%252C_Ghats%252C_Cremation_ceremony_in_progress.jpg",
  ],
  rome: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F7e%2FTrevi_Fountain%252C_Rome%252C_Italy_2_-_May_2007.jpg%2F800px-Trevi_Fountain%252C_Rome%252C_Italy_2_-_May_2007.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fde%2FColosseo_2020.jpg%2F800px-Colosseo_2020.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F7e%2FTrevi_Fountain%252C_Rome%252C_Italy_2_-_May_2007.jpg%2F800px-Trevi_Fountain%252C_Rome%252C_Italy_2_-_May_2007.jpg",
  ],
  prague: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fa%2Fa7%2FPrague_%25286365119737%2529.jpg%2F800px-Prague_%25286365119737%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fa%2Fa7%2FPrague_%25286365119737%2529.jpg%2F800px-Prague_%25286365119737%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fa%2Fa7%2FPrague_%25286365119737%2529.jpg%2F800px-Prague_%25286365119737%2529.jpg",
  ],
  cairo: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fca%2FCairo_Skyline_%25282020%2529.jpg%2F800px-Cairo_Skyline_%25282020%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fca%2FCairo_Skyline_%25282020%2529.jpg%2F800px-Cairo_Skyline_%25282020%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fca%2FCairo_Skyline_%25282020%2529.jpg%2F800px-Cairo_Skyline_%25282020%2529.jpg",
  ],
  "taj-mahal": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F1%2F1d%2FTaj_Mahal_%2528Edited%2529.jpeg%2F800px-Taj_Mahal_%2528Edited%2529.jpeg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F1%2F1d%2FTaj_Mahal_%2528Edited%2529.jpeg%2F800px-Taj_Mahal_%2528Edited%2529.jpeg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F1%2F1d%2FTaj_Mahal_%2528Edited%2529.jpeg%2F800px-Taj_Mahal_%2528Edited%2529.jpeg",
  ],
  jaipur: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F41%2FEast_facade_Hawa_Mahal_Jaipur_from_ground_level_%2528July_2022%2529_-_img_01.jpg%2F800px-East_facade_Hawa_Mahal_Jaipur_from_ground_level_%2528July_2022%2529_-_img_01.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F41%2FEast_facade_Hawa_Mahal_Jaipur_from_ground_level_%2528July_2022%2529_-_img_01.jpg%2F800px-East_facade_Hawa_Mahal_Jaipur_from_ground_level_%2528July_2022%2529_-_img_01.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F41%2FEast_facade_Hawa_Mahal_Jaipur_from_ground_level_%2528July_2022%2529_-_img_01.jpg%2F800px-East_facade_Hawa_Mahal_Jaipur_from_ground_level_%2528July_2022%2529_-_img_01.jpg",
  ],
  udaipur: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F6f%2FEvening_view%252C_City_Palace%252C_Udaipur.jpg%2F800px-Evening_view%252C_City_Palace%252C_Udaipur.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F6f%2FEvening_view%252C_City_Palace%252C_Udaipur.jpg%2F800px-Evening_view%252C_City_Palace%252C_Udaipur.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F6f%2FEvening_view%252C_City_Palace%252C_Udaipur.jpg%2F800px-Evening_view%252C_City_Palace%252C_Udaipur.jpg",
  ],
  goa: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ffc%2FBeachFun.jpg%2F800px-BeachFun.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ffc%2FBeachFun.jpg%2F800px-BeachFun.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ffc%2FBeachFun.jpg%2F800px-BeachFun.jpg",
  ],
  amritsar: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F9%2F94%2FThe_Golden_Temple_of_Amrithsar_7.jpg%2F800px-The_Golden_Temple_of_Amrithsar_7.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F9%2F94%2FThe_Golden_Temple_of_Amrithsar_7.jpg%2F800px-The_Golden_Temple_of_Amrithsar_7.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F9%2F94%2FThe_Golden_Temple_of_Amrithsar_7.jpg%2F800px-The_Golden_Temple_of_Amrithsar_7.jpg",
  ],
  paris: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4b%2FLa_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%252C_Paris_ao%25C3%25BBt_2014_%25282%2529.jpg%2F800px-La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%252C_Paris_ao%25C3%25BBt_2014_%25282%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4b%2FLa_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%252C_Paris_ao%25C3%25BBt_2014_%25282%2529.jpg%2F800px-La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%252C_Paris_ao%25C3%25BBt_2014_%25282%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4b%2FLa_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%252C_Paris_ao%25C3%25BBt_2014_%25282%2529.jpg%2F800px-La_Tour_Eiffel_vue_de_la_Tour_Saint-Jacques%252C_Paris_ao%25C3%25BBt_2014_%25282%2529.jpg",
  ],
  london: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F67%2FLondon_Skyline_%2528125508655%2529.jpeg%2F800px-London_Skyline_%2528125508655%2529.jpeg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F67%2FLondon_Skyline_%2528125508655%2529.jpeg%2F800px-London_Skyline_%2528125508655%2529.jpeg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F67%2FLondon_Skyline_%2528125508655%2529.jpeg%2F800px-London_Skyline_%2528125508655%2529.jpeg",
  ],
  delhi: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F40%2FJama_Masjid_2011.jpg%2F800px-Jama_Masjid_2011.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F40%2FJama_Masjid_2011.jpg%2F800px-Jama_Masjid_2011.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F40%2FJama_Masjid_2011.jpg%2F800px-Jama_Masjid_2011.jpg",
  ],
  mumbai: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F2%2F27%2F%25E0%25A6%2593%25E0%25A6%25B0%25E0%25A6%25B2%25E0%25A6%25BF%25E0%25A6%25B0_%25E0%25A6%2597%25E0%25A6%2597%25E0%25A6%25A8%25E0%25A6%25B0%25E0%25A7%2588%25E0%25A6%2596%25E0%25A6%25BF%25E0%25A6%2595_%25E0%25A6%25A6%25E0%25A7%2583%25E0%25A6%25B6%25E0%25A7%258D%25E0%25A6%25AF.jpg%2F800px-%25E0%25A6%2593%25E0%25A6%25B0%25E0%25A6%25B2%25E0%25A6%25BF%25E0%25A6%25B0_%25E0%25A6%2597%25E0%25A6%2597%25E0%25A6%25A8%25E0%25A6%25B0%25E0%25A7%2588%25E0%25A6%2596%25E0%25A6%25BF%25E0%25A6%2595_%25E0%25A6%25A6%25E0%25A7%2583%25E0%25A6%25B6%25E0%25A7%258D%25E0%25A6%25AF.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F2%2F27%2F%25E0%25A6%2593%25E0%25A6%25B0%25E0%25A6%25B2%25E0%25A6%25BF%25E0%25A6%25B0_%25E0%25A6%2597%25E0%25A6%2597%25E0%25A6%25A8%25E0%25A6%25B0%25E0%25A7%2588%25E0%25A6%2596%25E0%25A6%25BF%25E0%25A6%2595_%25E0%25A6%25A6%25E0%25A7%2583%25E0%25A6%25B6%25E0%25A7%258D%25E0%25A6%25AF.jpg%2F800px-%25E0%25A6%2593%25E0%25A6%25B0%25E0%25A6%25B2%25E0%25A6%25BF%25E0%25A6%25B0_%25E0%25A6%2597%25E0%25A6%2597%25E0%25A6%25A8%25E0%25A6%25B0%25E0%25A7%2588%25E0%25A6%2596%25E0%25A6%25BF%25E0%25A6%2595_%25E0%25A6%25A6%25E0%25A7%2583%25E0%25A6%25B6%25E0%25A7%258D%25E0%25A6%25AF.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F2%2F27%2F%25E0%25A6%2593%25E0%25A6%25B0%25E0%25A6%25B2%25E0%25A6%25BF%25E0%25A6%25B0_%25E0%25A6%2597%25E0%25A6%2597%25E0%25A6%25A8%25E0%25A6%25B0%25E0%25A7%2588%25E0%25A6%2596%25E0%25A6%25BF%25E0%25A6%2595_%25E0%25A6%25A6%25E0%25A7%2583%25E0%25A6%25B6%25E0%25A7%258D%25E0%25A6%25AF.jpg%2F800px-%25E0%25A6%2593%25E0%25A6%25B0%25E0%25A6%25B2%25E0%25A6%25BF%25E0%25A6%25B0_%25E0%25A6%2597%25E0%25A6%2597%25E0%25A6%25A8%25E0%25A6%25B0%25E0%25A7%2588%25E0%25A6%2596%25E0%25A6%25BF%25E0%25A6%2595_%25E0%25A6%25A6%25E0%25A7%2583%25E0%25A6%25B6%25E0%25A7%258D%25E0%25A6%25AF.jpg",
  ],
  istanbul: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fcb%2FHistorical_peninsula_and_modern_skyline_of_Istanbul.jpg%2F800px-Historical_peninsula_and_modern_skyline_of_Istanbul.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fcb%2FHistorical_peninsula_and_modern_skyline_of_Istanbul.jpg%2F800px-Historical_peninsula_and_modern_skyline_of_Istanbul.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fcb%2FHistorical_peninsula_and_modern_skyline_of_Istanbul.jpg%2F800px-Historical_peninsula_and_modern_skyline_of_Istanbul.jpg",
  ],
  barcelona: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F5d%2FAerial_view_of_Barcelona%252C_Spain_%252851227309370%2529_edited.jpg%2F800px-Aerial_view_of_Barcelona%252C_Spain_%252851227309370%2529_edited.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F5d%2FAerial_view_of_Barcelona%252C_Spain_%252851227309370%2529_edited.jpg%2F800px-Aerial_view_of_Barcelona%252C_Spain_%252851227309370%2529_edited.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F5d%2FAerial_view_of_Barcelona%252C_Spain_%252851227309370%2529_edited.jpg%2F800px-Aerial_view_of_Barcelona%252C_Spain_%252851227309370%2529_edited.jpg",
  ],
  tokyo: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb2%2FSkyscrapers_of_Shinjuku_2009_January.jpg%2F800px-Skyscrapers_of_Shinjuku_2009_January.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb2%2FSkyscrapers_of_Shinjuku_2009_January.jpg%2F800px-Skyscrapers_of_Shinjuku_2009_January.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb2%2FSkyscrapers_of_Shinjuku_2009_January.jpg%2F800px-Skyscrapers_of_Shinjuku_2009_January.jpg",
  ],
  "new-york": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F7a%2FView_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%2528cropped%2529.jpg%2F800px-View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%2528cropped%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F7a%2FView_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%2528cropped%2529.jpg%2F800px-View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%2528cropped%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F7a%2FView_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%2528cropped%2529.jpg%2F800px-View_of_Empire_State_Building_from_Rockefeller_Center_New_York_City_dllu_%2528cropped%2529.jpg",
  ],
  fez: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fd5%2FUniversity_karaouiyine_of_fes.jpg%2F800px-University_karaouiyine_of_fes.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fd5%2FUniversity_karaouiyine_of_fes.jpg%2F800px-University_karaouiyine_of_fes.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fd5%2FUniversity_karaouiyine_of_fes.jpg%2F800px-University_karaouiyine_of_fes.jpg",
  ],
  vatican: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff5%2FBasilica_di_San_Pietro_in_Vaticano_September_2015-1a.jpg%2F800px-Basilica_di_San_Pietro_in_Vaticano_September_2015-1a.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff5%2FBasilica_di_San_Pietro_in_Vaticano_September_2015-1a.jpg%2F800px-Basilica_di_San_Pietro_in_Vaticano_September_2015-1a.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff5%2FBasilica_di_San_Pietro_in_Vaticano_September_2015-1a.jpg%2F800px-Basilica_di_San_Pietro_in_Vaticano_September_2015-1a.jpg",
  ],
  jerusalem: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff6%2F2014-06_East_Jerusalem_090_%252814936890061%2529.jpg%2F800px-2014-06_East_Jerusalem_090_%252814936890061%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff6%2F2014-06_East_Jerusalem_090_%252814936890061%2529.jpg%2F800px-2014-06_East_Jerusalem_090_%252814936890061%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff6%2F2014-06_East_Jerusalem_090_%252814936890061%2529.jpg%2F800px-2014-06_East_Jerusalem_090_%252814936890061%2529.jpg",
  ],
  bali: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F5d%2FUbud_%252849818456887%2529.jpg%2F800px-Ubud_%252849818456887%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F5d%2FUbud_%252849818456887%2529.jpg%2F800px-Ubud_%252849818456887%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F5d%2FUbud_%252849818456887%2529.jpg%2F800px-Ubud_%252849818456887%2529.jpg",
  ],
  mecca: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F3f%2FGreat_Mosque_of_Mecca1.jpg%2F800px-Great_Mosque_of_Mecca1.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F3f%2FGreat_Mosque_of_Mecca1.jpg%2F800px-Great_Mosque_of_Mecca1.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F3f%2FGreat_Mosque_of_Mecca1.jpg%2F800px-Great_Mosque_of_Mecca1.jpg",
  ],
  maldives: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F8%2F83%2FMal%25C3%25A9.jpg%2F800px-Mal%25C3%25A9.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F8%2F83%2FMal%25C3%25A9.jpg%2F800px-Mal%25C3%25A9.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F8%2F83%2FMal%25C3%25A9.jpg%2F800px-Mal%25C3%25A9.jpg",
  ],
  santorini: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F8%2F86%2FOia_Santorini_Blue_Domes.jpg%2F800px-Oia_Santorini_Blue_Domes.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F8%2F86%2FOia_Santorini_Blue_Domes.jpg%2F800px-Oia_Santorini_Blue_Domes.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F8%2F86%2FOia_Santorini_Blue_Domes.jpg%2F800px-Oia_Santorini_Blue_Domes.jpg",
  ],
  phuket: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F60%2FPhuket_Aerial.jpg%2F800px-Phuket_Aerial.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F60%2FPhuket_Aerial.jpg%2F800px-Phuket_Aerial.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F60%2FPhuket_Aerial.jpg%2F800px-Phuket_Aerial.jpg",
  ],
  "swiss-alps": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F60%2FMatterhorn_from_Domh%25C3%25BCtte_-_2.jpg%2F800px-Matterhorn_from_Domh%25C3%25BCtte_-_2.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F60%2FMatterhorn_from_Domh%25C3%25BCtte_-_2.jpg%2F800px-Matterhorn_from_Domh%25C3%25BCtte_-_2.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F6%2F60%2FMatterhorn_from_Domh%25C3%25BCtte_-_2.jpg%2F800px-Matterhorn_from_Domh%25C3%25BCtte_-_2.jpg",
  ],
  patagonia: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc8%2FPerito_Moreno_Glacier_2023.jpg%2F800px-Perito_Moreno_Glacier_2023.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc8%2FPerito_Moreno_Glacier_2023.jpg%2F800px-Perito_Moreno_Glacier_2023.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc8%2FPerito_Moreno_Glacier_2023.jpg%2F800px-Perito_Moreno_Glacier_2023.jpg",
  ],
  "nepal-himalaya": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc8%2FHimalayas_and_allied_ranges_NASA_Landsat_showing_the_eight_thousanders%252C_annotated_with_major_rivers.jpg%2F800px-Himalayas_and_allied_ranges_NASA_Landsat_showing_the_eight_thousanders%252C_annotated_with_major_rivers.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc8%2FHimalayas_and_allied_ranges_NASA_Landsat_showing_the_eight_thousanders%252C_annotated_with_major_rivers.jpg%2F800px-Himalayas_and_allied_ranges_NASA_Landsat_showing_the_eight_thousanders%252C_annotated_with_major_rivers.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc8%2FHimalayas_and_allied_ranges_NASA_Landsat_showing_the_eight_thousanders%252C_annotated_with_major_rivers.jpg%2F800px-Himalayas_and_allied_ranges_NASA_Landsat_showing_the_eight_thousanders%252C_annotated_with_major_rivers.jpg",
  ],
  amazon: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F56%2FAmazon17_%25285641020319%2529.jpg%2F800px-Amazon17_%25285641020319%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F56%2FAmazon17_%25285641020319%2529.jpg%2F800px-Amazon17_%25285641020319%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F56%2FAmazon17_%25285641020319%2529.jpg%2F800px-Amazon17_%25285641020319%2529.jpg",
  ],
  serengeti: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F48%2FTanzania-_Serengeti_National_Park-_elefante.jpg%2F800px-Tanzania-_Serengeti_National_Park-_elefante.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F48%2FTanzania-_Serengeti_National_Park-_elefante.jpg%2F800px-Tanzania-_Serengeti_National_Park-_elefante.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F48%2FTanzania-_Serengeti_National_Park-_elefante.jpg%2F800px-Tanzania-_Serengeti_National_Park-_elefante.jpg",
  ],
  "great-barrier-reef": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4f%2FISS-45_StoryOfWater%252C_Great_Barrier_Reef%252C_Australia.jpg%2F800px-ISS-45_StoryOfWater%252C_Great_Barrier_Reef%252C_Australia.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4f%2FISS-45_StoryOfWater%252C_Great_Barrier_Reef%252C_Australia.jpg%2F800px-ISS-45_StoryOfWater%252C_Great_Barrier_Reef%252C_Australia.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4f%2FISS-45_StoryOfWater%252C_Great_Barrier_Reef%252C_Australia.jpg%2F800px-ISS-45_StoryOfWater%252C_Great_Barrier_Reef%252C_Australia.jpg",
  ],
  iceland: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F1%2F18%2FGullfoss_from_the_Air_%2528cropped%2529.jpg%2F800px-Gullfoss_from_the_Air_%2528cropped%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F1%2F18%2FGullfoss_from_the_Air_%2528cropped%2529.jpg%2F800px-Gullfoss_from_the_Air_%2528cropped%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F1%2F18%2FGullfoss_from_the_Air_%2528cropped%2529.jpg%2F800px-Gullfoss_from_the_Air_%2528cropped%2529.jpg",
  ],
  "new-zealand": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb6%2FMilford_Sound_%2528New_Zealand%2529.JPG%2F800px-Milford_Sound_%2528New_Zealand%2529.JPG",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb6%2FMilford_Sound_%2528New_Zealand%2529.JPG%2F800px-Milford_Sound_%2528New_Zealand%2529.JPG",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb6%2FMilford_Sound_%2528New_Zealand%2529.JPG%2F800px-Milford_Sound_%2528New_Zealand%2529.JPG",
  ],
  "costa-rica": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F3a%2FArenal_volcano_%252870785p%2529_%2528cropped%2529.jpg%2F800px-Arenal_volcano_%252870785p%2529_%2528cropped%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F3a%2FArenal_volcano_%252870785p%2529_%2528cropped%2529.jpg%2F800px-Arenal_volcano_%252870785p%2529_%2528cropped%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F3a%2FArenal_volcano_%252870785p%2529_%2528cropped%2529.jpg%2F800px-Arenal_volcano_%252870785p%2529_%2528cropped%2529.jpg",
  ],
  queenstown: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc9%2FQueenstown_1_%25288168013172%2529.jpg%2F800px-Queenstown_1_%25288168013172%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc9%2FQueenstown_1_%25288168013172%2529.jpg%2F800px-Queenstown_1_%25288168013172%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc9%2FQueenstown_1_%25288168013172%2529.jpg%2F800px-Queenstown_1_%25288168013172%2529.jpg",
  ],
  hampi: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fdd%2FWide_angle_of_Galigopuram_of_Virupaksha_Temple%252C_Hampi_%252804%2529_%2528cropped%2529.jpg%2F800px-Wide_angle_of_Galigopuram_of_Virupaksha_Temple%252C_Hampi_%252804%2529_%2528cropped%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fdd%2FWide_angle_of_Galigopuram_of_Virupaksha_Temple%252C_Hampi_%252804%2529_%2528cropped%2529.jpg%2F800px-Wide_angle_of_Galigopuram_of_Virupaksha_Temple%252C_Hampi_%252804%2529_%2528cropped%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fdd%2FWide_angle_of_Galigopuram_of_Virupaksha_Temple%252C_Hampi_%252804%2529_%2528cropped%2529.jpg%2F800px-Wide_angle_of_Galigopuram_of_Virupaksha_Temple%252C_Hampi_%252804%2529_%2528cropped%2529.jpg",
  ],
  khajuraho: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fe%2Fe7%2F1_Khajuraho.jpg%2F800px-1_Khajuraho.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fe%2Fe7%2F1_Khajuraho.jpg%2F800px-1_Khajuraho.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fe%2Fe7%2F1_Khajuraho.jpg%2F800px-1_Khajuraho.jpg",
  ],
  "kerala-backwaters": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fe%2Fee%2FHouse_Boat_DSW.jpg%2F800px-House_Boat_DSW.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fe%2Fee%2FHouse_Boat_DSW.jpg%2F800px-House_Boat_DSW.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fe%2Fee%2FHouse_Boat_DSW.jpg%2F800px-House_Boat_DSW.jpg",
  ],
  munnar: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb9%2FMunnar_Overview.jpg%2F800px-Munnar_Overview.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb9%2FMunnar_Overview.jpg%2F800px-Munnar_Overview.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb9%2FMunnar_Overview.jpg%2F800px-Munnar_Overview.jpg",
  ],
  rishikesh: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F74%2FTrayambakeshwar_Temple_VK.jpg%2F800px-Trayambakeshwar_Temple_VK.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F74%2FTrayambakeshwar_Temple_VK.jpg%2F800px-Trayambakeshwar_Temple_VK.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F7%2F74%2FTrayambakeshwar_Temple_VK.jpg%2F800px-Trayambakeshwar_Temple_VK.jpg",
  ],
  haridwar: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F0%2F00%2FGanga_aarti_haridwar_01.jpg%2F800px-Ganga_aarti_haridwar_01.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F0%2F00%2FGanga_aarti_haridwar_01.jpg%2F800px-Ganga_aarti_haridwar_01.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F0%2F00%2FGanga_aarti_haridwar_01.jpg%2F800px-Ganga_aarti_haridwar_01.jpg",
  ],
  "ajanta-ellora": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc3%2FAjanta_%252863%2529.jpg%2F800px-Ajanta_%252863%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc3%2FAjanta_%252863%2529.jpg%2F800px-Ajanta_%252863%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fc3%2FAjanta_%252863%2529.jpg%2F800px-Ajanta_%252863%2529.jpg",
  ],
  "leh-ladakh": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4d%2FLeh_City_seen_from_Shanti_Stupa.JPG%2F800px-Leh_City_seen_from_Shanti_Stupa.JPG",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4d%2FLeh_City_seen_from_Shanti_Stupa.JPG%2F800px-Leh_City_seen_from_Shanti_Stupa.JPG",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4d%2FLeh_City_seen_from_Shanti_Stupa.JPG%2F800px-Leh_City_seen_from_Shanti_Stupa.JPG",
  ],
  shimla: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fba%2FLandscape_of_Shimla_%252C_Himachal_Pradesh.jpg%2F800px-Landscape_of_Shimla_%252C_Himachal_Pradesh.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fba%2FLandscape_of_Shimla_%252C_Himachal_Pradesh.jpg%2F800px-Landscape_of_Shimla_%252C_Himachal_Pradesh.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fba%2FLandscape_of_Shimla_%252C_Himachal_Pradesh.jpg%2F800px-Landscape_of_Shimla_%252C_Himachal_Pradesh.jpg",
  ],
  manali: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F0%2F03%2FManali_City.jpg%2F800px-Manali_City.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F0%2F03%2FManali_City.jpg%2F800px-Manali_City.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F0%2F03%2FManali_City.jpg%2F800px-Manali_City.jpg",
  ],
  bangalore: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fcd%2FView_from_Visvesvaraya_Industrial_and_Technological_Museum_%25282025%2529_02.jpg%2F800px-View_from_Visvesvaraya_Industrial_and_Technological_Museum_%25282025%2529_02.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fcd%2FView_from_Visvesvaraya_Industrial_and_Technological_Museum_%25282025%2529_02.jpg%2F800px-View_from_Visvesvaraya_Industrial_and_Technological_Museum_%25282025%2529_02.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fc%2Fcd%2FView_from_Visvesvaraya_Industrial_and_Technological_Museum_%25282025%2529_02.jpg%2F800px-View_from_Visvesvaraya_Industrial_and_Technological_Museum_%25282025%2529_02.jpg",
  ],
  madurai: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff4%2FMeenakshi_Amman_West_Tower.jpg%2F800px-Meenakshi_Amman_West_Tower.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff4%2FMeenakshi_Amman_West_Tower.jpg%2F800px-Meenakshi_Amman_West_Tower.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Ff%2Ff4%2FMeenakshi_Amman_West_Tower.jpg%2F800px-Meenakshi_Amman_West_Tower.jpg",
  ],
  konark: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F47%2FKonarka_Temple.jpg%2F800px-Konarka_Temple.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F47%2FKonarka_Temple.jpg%2F800px-Konarka_Temple.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F47%2FKonarka_Temple.jpg%2F800px-Konarka_Temple.jpg",
  ],
  "fatehpur-sikri": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb5%2FFatehput_Sikiri_Buland_Darwaza_gate_2010.jpg%2F800px-Fatehput_Sikiri_Buland_Darwaza_gate_2010.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb5%2FFatehput_Sikiri_Buland_Darwaza_gate_2010.jpg%2F800px-Fatehput_Sikiri_Buland_Darwaza_gate_2010.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fb%2Fb5%2FFatehput_Sikiri_Buland_Darwaza_gate_2010.jpg%2F800px-Fatehput_Sikiri_Buland_Darwaza_gate_2010.jpg",
  ],
  coorg: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F1%2F17%2FTadiandamol_Valley%252C_Western_Ghats.jpg%2F800px-Tadiandamol_Valley%252C_Western_Ghats.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F1%2F17%2FTadiandamol_Valley%252C_Western_Ghats.jpg%2F800px-Tadiandamol_Valley%252C_Western_Ghats.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F1%2F17%2FTadiandamol_Valley%252C_Western_Ghats.jpg%2F800px-Tadiandamol_Valley%252C_Western_Ghats.jpg",
  ],
  andaman: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F2%2F2f%2FThe_Coral_Reef_at_the_Andaman_Islands.jpg%2F800px-The_Coral_Reef_at_the_Andaman_Islands.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F2%2F2f%2FThe_Coral_Reef_at_the_Andaman_Islands.jpg%2F800px-The_Coral_Reef_at_the_Andaman_Islands.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F2%2F2f%2FThe_Coral_Reef_at_the_Andaman_Islands.jpg%2F800px-The_Coral_Reef_at_the_Andaman_Islands.jpg",
  ],
  meghalaya: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F55%2FDawki_River%252C_Meghalaya%252C_India.jpg%2F800px-Dawki_River%252C_Meghalaya%252C_India.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F55%2FDawki_River%252C_Meghalaya%252C_India.jpg%2F800px-Dawki_River%252C_Meghalaya%252C_India.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F55%2FDawki_River%252C_Meghalaya%252C_India.jpg%2F800px-Dawki_River%252C_Meghalaya%252C_India.jpg",
  ],
  tirupati: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4e%2FTirumala_090615.jpg%2F800px-Tirumala_090615.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4e%2FTirumala_090615.jpg%2F800px-Tirumala_090615.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F4e%2FTirumala_090615.jpg%2F800px-Tirumala_090615.jpg",
  ],
  jaisalmer: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F46%2FJaisalmer_Fort.jpg%2F800px-Jaisalmer_Fort.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F46%2FJaisalmer_Fort.jpg%2F800px-Jaisalmer_Fort.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F4%2F46%2FJaisalmer_Fort.jpg%2F800px-Jaisalmer_Fort.jpg",
  ],
  jodhpur: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F9%2F99%2FMehrangarh_Fort_sanhita.jpg%2F800px-Mehrangarh_Fort_sanhita.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F9%2F99%2FMehrangarh_Fort_sanhita.jpg%2F800px-Mehrangarh_Fort_sanhita.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F9%2F99%2FMehrangarh_Fort_sanhita.jpg%2F800px-Mehrangarh_Fort_sanhita.jpg",
  ],
  "valley-of-flowers": [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F50%2FValley_of_flowers_national_park%252C_Uttarakhand%252C_India_03_%2528edit%2529.jpg%2F800px-Valley_of_flowers_national_park%252C_Uttarakhand%252C_India_03_%2528edit%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F50%2FValley_of_flowers_national_park%252C_Uttarakhand%252C_India_03_%2528edit%2529.jpg%2F800px-Valley_of_flowers_national_park%252C_Uttarakhand%252C_India_03_%2528edit%2529.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F5%2F50%2FValley_of_flowers_national_park%252C_Uttarakhand%252C_India_03_%2528edit%2529.jpg%2F800px-Valley_of_flowers_national_park%252C_Uttarakhand%252C_India_03_%2528edit%2529.jpg",
  ],
  kolkata: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fd7%2FKolkata_maidan.jpg%2F800px-Kolkata_maidan.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fd7%2FKolkata_maidan.jpg%2F800px-Kolkata_maidan.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2Fd%2Fd7%2FKolkata_maidan.jpg%2F800px-Kolkata_maidan.jpg",
  ],
  chennai: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F32%2FChennai_Central.jpg%2F800px-Chennai_Central.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F32%2FChennai_Central.jpg%2F800px-Chennai_Central.jpg",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F3%2F32%2FChennai_Central.jpg%2F800px-Chennai_Central.jpg",
  ],
  hyderabad: [
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F8%2F88%2FDowntown_hyderabad_drone.png%2F800px-Downtown_hyderabad_drone.png",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F8%2F88%2FDowntown_hyderabad_drone.png%2F800px-Downtown_hyderabad_drone.png",
    "https://res.cloudinary.com/dihhuyjjt/image/fetch/f_auto,q_auto/https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Fthumb%2F8%2F88%2FDowntown_hyderabad_drone.png%2F800px-Downtown_hyderabad_drone.png",
  ],
};

/** Picsum.photos – fallback when no location image is set (no 404s). */
const P = (seed: string, n: number, w = 800, h = 600) =>
  `https://picsum.photos/seed/${seed}-${n}/${w}/${h}`;

/** Helper: 3 images for a destination (card + gallery). Use curated images when available. */
const imgs = (id: string): string[] =>
  DESTINATION_IMAGES[id] ?? [P(id, 1), P(id, 2), P(id, 3)];

export const destinations: Destination[] = [
  // —— History (15–20) ——
  {
    id: "angkor-wat",
    name: "Angkor Wat, Cambodia",
    category: "History",
    rating: 4.9,
    shortDescription: "The world's largest religious monument and a masterpiece of Khmer architecture.",
    about:
      "Angkor Wat was built in the early 12th century by the Khmer king Suryavarman II. Originally dedicated to the Hindu god Vishnu, it later became a Buddhist temple. It symbolises Mount Meru, the sacred centre of the universe in Hindu and Buddhist cosmology. Today it is a UNESCO World Heritage Site and a powerful symbol of Cambodia's history.",
    images: imgs("angkor-wat"),
  },
  {
    id: "machu-picchu",
    name: "Machu Picchu, Peru",
    category: "History",
    rating: 4.9,
    shortDescription: "Inca citadel high in the Andes and one of the New Seven Wonders of the World.",
    about:
      "Machu Picchu was built in the 15th century under the Inca emperor Pachacuti. It was an estate and ceremonial site, abandoned during the Spanish conquest and unknown to the outside world until 1911. Its precise purpose remains debated, but it reflects the Inca's advanced engineering and reverence for the landscape. It became a UNESCO World Heritage Site in 1983.",
    images: imgs("machu-picchu"),
  },
  {
    id: "petra",
    name: "Petra, Jordan",
    category: "History",
    rating: 4.9,
    shortDescription: "Ancient Nabataean city famous for its rock-cut architecture and the Treasury.",
    about:
      "Petra was the capital of the Nabataean kingdom from around the 4th century BCE. The city was carved into red sandstone cliffs and controlled important trade routes. The Romans annexed it in 106 CE. It was largely forgotten in the West until the 19th century. Today it is a UNESCO World Heritage Site and one of the New Seven Wonders of the World.",
    images: imgs("petra"),
  },
  {
    id: "colosseum",
    name: "Colosseum, Italy",
    category: "History",
    rating: 4.8,
    shortDescription: "Iconic Roman amphitheatre and symbol of ancient Rome.",
    about:
      "The Colosseum (or Flavian Amphitheatre) was completed in 80 CE under the emperor Titus, after construction began under his father Vespasian around 72 CE. It could hold an estimated 50,000 to 80,000 spectators, who gathered for gladiatorial contests, animal hunts (venationes), mock sea battles, and public executions. The building is elliptical, with a complex system of vaults and arches that allowed quick entry and exit. It is the largest ancient amphitheatre ever built and remains one of the finest examples of Roman engineering and power.\n\n" +
      "The exterior had three tiers of arches, with columns in the Doric, Ionic, and Corinthian orders. Much of the outer wall and the original marble seating are now lost due to earthquakes and later reuse of the stone for other buildings in Rome. Despite this, the Colosseum is still an iconic symbol of the city and of ancient Rome. It has been a UNESCO World Heritage Site since 1980 and is one of the New Seven Wonders of the World. Today it is one of the most visited tourist sites in Italy and is used as a powerful symbol of the endurance of Roman culture and history.",
    images: imgs("colosseum"),
  },
  {
    id: "acropolis",
    name: "Acropolis, Greece",
    category: "History",
    rating: 4.9,
    shortDescription: "Ancient citadel in Athens dominated by the Parthenon.",
    about:
      "The Acropolis has been inhabited since prehistoric times. In the 5th century BCE, under Pericles, it was rebuilt with the Parthenon and other temples dedicated to Athena. It represents the peak of classical Greek art and democracy. Damaged and repurposed over the centuries, it is now a UNESCO World Heritage Site and a symbol of Western civilisation.",
    images: imgs("acropolis"),
  },
  {
    id: "pompeii",
    name: "Pompeii, Italy",
    category: "History",
    rating: 4.8,
    shortDescription: "Roman city preserved by the eruption of Mount Vesuvius in 79 CE.",
    about:
      "Pompeii was a prosperous Roman town until it was buried under volcanic ash and pumice when Vesuvius erupted in 79 CE. The site lay largely undisturbed for centuries, preserving buildings, art, and everyday objects. Excavations began in the 18th century and continue today. Pompeii offers an unparalleled glimpse into Roman life.",
    images: imgs("pompeii"),
  },
  {
    id: "kyoto",
    name: "Kyoto, Japan",
    category: "History",
    rating: 4.8,
    shortDescription: "Ancient capital with temples, bamboo forests, and tea ceremonies.",
    about:
      "Kyoto was the imperial capital of Japan from 794 until 1868. It is home to hundreds of temples and shrines, including Kinkaku-ji and Fushimi Inari. Its historic monuments are collectively a UNESCO World Heritage Site. Kyoto remains the heart of traditional Japanese culture, from geisha districts to tea houses and gardens.",
    images: imgs("kyoto"),
  },
  {
    id: "varanasi",
    name: "Varanasi, India",
    category: "History",
    rating: 4.7,
    shortDescription: "One of the world's oldest continually inhabited cities and a sacred Hindu site.",
    about:
      "Varanasi, on the banks of the Ganges, has been a centre of pilgrimage and learning for over three millennia. It is sacred to Shiva and is believed to grant liberation from the cycle of rebirth. The ghats, temples, and narrow lanes reflect layers of history. It remains a living symbol of Hindu spiritual and cultural tradition.",
    images: imgs("varanasi"),
  },
  {
    id: "rome",
    name: "Rome, Italy",
    category: "History",
    rating: 4.8,
    shortDescription: "Eternal City with ancient ruins, Renaissance art, and the Vatican.",
    about:
      "Rome was the capital of the Roman Republic and Empire and later the heart of the Renaissance and the Catholic Church. From the Forum and Colosseum to St Peter's and the Sistine Chapel, its layers of history span over two and a half millennia. The historic centre is a UNESCO World Heritage Site.",
    images: imgs("rome"),
  },
  {
    id: "istanbul",
    name: "Istanbul, Turkey",
    category: "History",
    rating: 4.8,
    shortDescription: "Former Byzantium and Constantinople; where Europe meets Asia.",
    about:
      "Istanbul has been a major city for over two millennia, serving as capital of the Roman, Byzantine, and Ottoman empires. Hagia Sophia, the Blue Mosque, and the Topkapi Palace reflect its layered past. The historic areas are a UNESCO World Heritage Site. The city remains a cultural and economic bridge between continents.",
    images: imgs("istanbul"),
  },
  {
    id: "prague",
    name: "Prague, Czech Republic",
    category: "History",
    rating: 4.7,
    shortDescription: "Medieval Old Town, castle, and Gothic architecture.",
    about:
      "Prague's historic centre has been a political and cultural hub since the Middle Ages. The Prague Castle, Charles Bridge, and Old Town Square survived wars and modernisation. The city was the seat of Holy Roman emperors and the heart of the Bohemian Reformation. Its monuments are a UNESCO World Heritage Site.",
    images: imgs("prague"),
  },
  {
    id: "cairo",
    name: "Cairo, Egypt",
    category: "History",
    rating: 4.7,
    shortDescription: "Home to the Pyramids of Giza and the Egyptian Museum.",
    about:
      "Cairo has been the political and cultural centre of Egypt for over a thousand years. Nearby Giza is home to the Great Pyramid and the Sphinx, built in the 26th century BCE. Islamic Cairo preserves medieval mosques and bazaars. The city sits at the crossroads of African, Mediterranean, and Islamic history.",
    images: imgs("cairo"),
  },
  {
    id: "fez",
    name: "Fez, Morocco",
    category: "History",
    rating: 4.7,
    shortDescription: "Medina, madrasas, and one of the world's oldest universities.",
    about:
      "Fez was founded in the 8th century and became a centre of learning and trade. Its medina, Fes el-Bali, is one of the largest car-free urban areas in the world and a UNESCO World Heritage Site. The University of al-Qarawiyyin is often cited as the oldest degree-granting university. The city preserves centuries of Islamic and Andalusian culture.",
    images: imgs("fez"),
  },
  {
    id: "vatican",
    name: "Vatican City",
    category: "History",
    rating: 4.9,
    shortDescription: "Smallest sovereign state and heart of the Catholic Church.",
    about:
      "Vatican City is the seat of the Pope and the centre of the Roman Catholic Church. St Peter's Basilica and the Vatican Museums, including the Sistine Chapel, hold some of the world's most important art and architecture. The state was established in 1929. Its cultural and religious significance draws millions of visitors each year.",
    images: imgs("vatican"),
  },
  {
    id: "jerusalem",
    name: "Jerusalem, Israel",
    category: "History",
    rating: 4.8,
    shortDescription: "Sacred to Judaism, Christianity, and Islam; ancient walled Old City.",
    about:
      "Jerusalem has been central to three major religions for millennia. The Old City contains the Western Wall, the Church of the Holy Sepulchre, and the Dome of the Rock. It has been fought over and rebuilt countless times. Its historic quarters are a UNESCO World Heritage Site and remain a living centre of faith and pilgrimage.",
    images: imgs("jerusalem"),
  },
  // —— Spiritual (reuse + add) ——
  {
    id: "bali",
    name: "Bali, Indonesia",
    category: "Spiritual",
    rating: 4.8,
    shortDescription: "Tropical paradise with Hindu temples, rice terraces, and beaches.",
    about:
      "Bali is the only majority-Hindu province in Indonesia. Its temples, ceremonies, and arts reflect a distinct blend of Hindu and local tradition. The island's landscapes range from volcanic peaks to rice terraces and coastlines. Tourism has grown strongly, but many villages still observe daily rituals and traditional crafts.",
    images: imgs("bali"),
  },
  {
    id: "mecca",
    name: "Mecca, Saudi Arabia",
    category: "Spiritual",
    rating: 4.9,
    shortDescription: "Birthplace of Islam and the holiest city for Muslims.",
    about:
      "Mecca is the birthplace of the Prophet Muhammad and the direction of Muslim prayer. The Kaaba, in the Masjid al-Haram, is Islam's most sacred site. The annual Hajj pilgrimage brings millions of Muslims from around the world. Access is restricted to Muslims; the city's history and faith make it central to Islamic identity.",
    images: imgs("mecca"),
  },
  // —— Beaches ——
  {
    id: "maldives",
    name: "Maldives",
    category: "Beaches",
    rating: 4.9,
    shortDescription: "Crystal-clear waters and overwater bungalows.",
    about:
      "The Maldives is an island nation in the Indian Ocean known for its atolls, coral reefs, and luxury resorts. Tourism and fishing are central to the economy. The country faces significant challenges from climate change and sea-level rise. Its marine life and clear waters make it a major destination for diving and relaxation.",
    images: imgs("maldives"),
  },
  {
    id: "santorini",
    name: "Santorini, Greece",
    category: "Beaches",
    rating: 4.8,
    shortDescription: "White villages on volcanic cliffs above the Aegean.",
    about:
      "Santorini is a volcanic island in the Cyclades. Its dramatic caldera, whitewashed buildings, and sunset views attract millions of visitors. The island has been shaped by one of the largest volcanic eruptions in recorded history. Today it is known for wine, archaeology, and its distinctive cliff-top towns.",
    images: imgs("santorini"),
  },
  {
    id: "phuket",
    name: "Phuket, Thailand",
    category: "Beaches",
    rating: 4.7,
    shortDescription: "Beaches, nightlife, and gateway to the Andaman Sea.",
    about:
      "Phuket is Thailand's largest island and a major tourist destination. Its west coast has popular beaches and resorts; the interior has forests and cultural sites. The island blends Thai, Chinese, and Portuguese influences. It serves as a base for diving, island-hopping, and exploring the Andaman region.",
    images: imgs("phuket"),
  },
  // —— Mountains ——
  {
    id: "swiss-alps",
    name: "Swiss Alps",
    category: "Mountains",
    rating: 4.9,
    shortDescription: "Majestic peaks and world-class skiing.",
    about:
      "The Swiss Alps cover a large part of Switzerland and extend into neighbouring countries. They are home to iconic peaks such as the Matterhorn and Jungfrau, and to skiing, hiking, and mountaineering. Alpine culture, cheese-making, and sustainable tourism are central to the region's identity and economy.",
    images: imgs("swiss-alps"),
  },
  {
    id: "patagonia",
    name: "Patagonia, Argentina",
    category: "Mountains",
    rating: 4.8,
    shortDescription: "Dramatic glaciers and towering granite peaks.",
    about:
      "Patagonia spans southern Argentina and Chile and is known for its vast, windswept landscapes. Glaciers, such as Perito Moreno, fjords, and the Andes draw adventurers and nature lovers. The region has a small population and a strong identity tied to ranching, conservation, and outdoor recreation.",
    images: imgs("patagonia"),
  },
  {
    id: "nepal-himalaya",
    name: "Himalayas, Nepal",
    category: "Mountains",
    rating: 4.9,
    shortDescription: "Home to Everest and ancient trekking routes.",
    about:
      "The Himalayas in Nepal include Mount Everest and some of the world's highest peaks. The region is deeply tied to Sherpa culture and Buddhism. Trekking routes such as the Everest Base Camp and Annapurna circuits attract thousands each year. The mountains are central to Nepal's identity, religion, and tourism.",
    images: imgs("nepal-himalaya"),
  },
  // —— Cities ——
  {
    id: "paris",
    name: "Paris, France",
    category: "Cities",
    rating: 4.8,
    shortDescription: "Art, fashion, and the Eiffel Tower.",
    about:
      "Paris has been a global centre of culture, politics, and ideas for centuries. Its museums, from the Louvre to the Musée d'Orsay, hold some of the world's greatest art. The city's boulevards, cafés, and monuments define its image. It remains one of the most visited cities and a symbol of European culture.",
    images: imgs("paris"),
  },
  {
    id: "tokyo",
    name: "Tokyo, Japan",
    category: "Cities",
    rating: 4.8,
    shortDescription: "Neon streets, temples, and cutting-edge culture.",
    about:
      "Tokyo is Japan's capital and one of the world's largest cities. It blends ancient shrines and gardens with ultra-modern districts. The city has been the political centre of Japan since the 17th century. Its food, fashion, and technology make it a major global destination.",
    images: imgs("tokyo"),
  },
  {
    id: "new-york",
    name: "New York City, USA",
    category: "Cities",
    rating: 4.7,
    shortDescription: "Skyscrapers, Broadway, and the Statue of Liberty.",
    about:
      "New York City is the most populous city in the United States and a global hub of finance, culture, and media. Its skyline, museums, theatres, and neighbourhoods are recognised worldwide. The city has been a gateway for immigration and a centre of innovation for over two centuries.",
    images: imgs("new-york"),
  },
  {
    id: "london",
    name: "London, United Kingdom",
    category: "Cities",
    rating: 4.8,
    shortDescription: "Historic capital with museums, palaces, and diversity.",
    about:
      "London has been a major city for two millennia and is the capital of the United Kingdom. Its landmarks include the Tower of London, Buckingham Palace, and the British Museum. The city is a global financial centre and one of the most culturally diverse in the world.",
    images: imgs("london"),
  },
  {
    id: "barcelona",
    name: "Barcelona, Spain",
    category: "Cities",
    rating: 4.8,
    shortDescription: "Gaudí, Gothic Quarter, and Mediterranean life.",
    about:
      "Barcelona is the capital of Catalonia and one of Spain's most visited cities. The works of Antoni Gaudí, including the Sagrada Família, define much of its image. The Gothic Quarter and the Ramblas reflect centuries of history. The city combines beach, culture, and a strong regional identity.",
    images: imgs("barcelona"),
  },
  // —— Nature ——
  {
    id: "amazon",
    name: "Amazon Rainforest",
    category: "Nature",
    rating: 4.6,
    shortDescription: "The world's largest tropical rainforest.",
    about:
      "The Amazon basin spans several South American countries and contains the largest tropical rainforest on Earth. It hosts an enormous variety of plants and animals and plays a vital role in global climate and water cycles. Deforestation and climate change pose serious threats. Conservation and sustainable use remain critical.",
    images: imgs("amazon"),
  },
  {
    id: "serengeti",
    name: "Serengeti, Tanzania",
    category: "Nature",
    rating: 4.9,
    shortDescription: "Vast plains and the great wildebeest migration.",
    about:
      "The Serengeti is a UNESCO World Heritage Site and one of the most famous wildlife areas on Earth. Its grasslands support large populations of wildebeest, zebras, and predators. The annual migration is one of the natural world's great spectacles. The ecosystem is closely linked with the Maasai Mara in Kenya.",
    images: imgs("serengeti"),
  },
  {
    id: "great-barrier-reef",
    name: "Great Barrier Reef, Australia",
    category: "Nature",
    rating: 4.8,
    shortDescription: "World's largest coral reef system.",
    about:
      "The Great Barrier Reef is the largest coral reef system on Earth and a UNESCO World Heritage Site. It supports a huge diversity of marine life and is vital to the region's ecology and economy. Climate change, pollution, and other pressures threaten the reef. Conservation and sustainable tourism are priorities.",
    images: imgs("great-barrier-reef"),
  },
  {
    id: "iceland",
    name: "Iceland",
    category: "Nature",
    rating: 4.8,
    shortDescription: "Volcanoes, glaciers, and the Northern Lights.",
    about:
      "Iceland sits on the Mid-Atlantic Ridge and is one of the most volcanically active places on Earth. Glaciers, geysers, waterfalls, and black-sand beaches draw visitors year-round. The population is small and concentrated; much of the island remains wild. Sustainable tourism and energy are central to national policy.",
    images: imgs("iceland"),
  },
  // —— Adventure ——
  {
    id: "new-zealand",
    name: "New Zealand",
    category: "Adventure",
    rating: 4.9,
    shortDescription: "Mountains, fjords, and filming location for Middle-earth.",
    about:
      "New Zealand's landscapes range from alpine peaks to fjords, beaches, and rainforests. It is known for outdoor activities such as hiking, skiing, and bungee jumping. Māori culture is an integral part of national identity. The country has been used as a backdrop for major films and is a major adventure-travel destination.",
    images: imgs("new-zealand"),
  },
  {
    id: "costa-rica",
    name: "Costa Rica",
    category: "Adventure",
    rating: 4.7,
    shortDescription: "Rainforests, volcanoes, and ecotourism.",
    about:
      "Costa Rica is known for its biodiversity and commitment to conservation. Much of the country is protected in national parks and reserves. Activities include zip-lining, rafting, wildlife watching, and beach visits. Stable democracy and ecotourism have made it a model for sustainable travel in Central America.",
    images: imgs("costa-rica"),
  },
  {
    id: "queenstown",
    name: "Queenstown, New Zealand",
    category: "Adventure",
    rating: 4.8,
    shortDescription: "Adventure capital with skiing, bungee, and lake scenery.",
    about:
      "Queenstown sits on the shores of Lake Wakatipu and is surrounded by the Southern Alps. It is known as the birthplace of commercial bungee jumping and offers skiing, hiking, and water sports. The town attracts thrill-seekers and nature lovers and is a gateway to Fiordland and other South Island highlights.",
    images: imgs("queenstown"),
  },
  // —— India (25) ——
  {
    id: "taj-mahal",
    name: "Taj Mahal, Agra",
    category: "History",
    rating: 4.9,
    shortDescription: "Iconic white-marble mausoleum and symbol of love.",
    about:
      "The Taj Mahal was built by the Mughal emperor Shah Jahan in memory of his wife Mumtaz Mahal. Construction began in 1632 and took about 22 years. The complex combines Persian, Islamic, and Indian influences and is set in formal gardens. It is a UNESCO World Heritage Site and one of the New Seven Wonders of the World.",
    images: imgs("taj-mahal"),
  },
  {
    id: "jaipur",
    name: "Jaipur, Rajasthan",
    category: "Cities",
    rating: 4.8,
    shortDescription: "Pink City with forts, palaces, and bazaars.",
    about:
      "Jaipur was founded in 1727 by Maharaja Sawai Jai Singh II and is the capital of Rajasthan. The city is known for its pink-washed buildings, the City Palace, Hawa Mahal, and Amber Fort. It forms part of the Golden Triangle with Delhi and Agra and is a gateway to Rajasthan's desert and heritage towns.",
    images: imgs("jaipur"),
  },
  {
    id: "udaipur",
    name: "Udaipur, Rajasthan",
    category: "Cities",
    rating: 4.8,
    shortDescription: "City of Lakes with palaces and lake views.",
    about:
      "Udaipur was founded in 1559 by Maharana Udai Singh II. The City Palace overlooks Lake Pichola, and the lake palaces and ghats give the city a romantic reputation. Udaipur is known for crafts, classical music, and as a setting for heritage hotels and cultural events.",
    images: imgs("udaipur"),
  },
  {
    id: "hampi",
    name: "Hampi, Karnataka",
    category: "History",
    rating: 4.8,
    shortDescription: "Ruins of the Vijayanagara Empire and boulder landscapes.",
    about:
      "Hampi was the capital of the Vijayanagara Empire from the 14th to 16th centuries. The site has hundreds of monuments: temples, markets, and royal structures set among giant boulders. It was sacked in 1565 and is now a UNESCO World Heritage Site and a major archaeological and tourist destination.",
    images: imgs("hampi"),
  },
  {
    id: "khajuraho",
    name: "Khajuraho, Madhya Pradesh",
    category: "History",
    rating: 4.7,
    shortDescription: "Temple complex famous for Nagara architecture and sculpture.",
    about:
      "The Khajuraho temples were built by the Chandela dynasty between the 10th and 12th centuries. About 25 temples survive, known for intricate carvings and Nagara-style architecture. The site is a UNESCO World Heritage Site and reflects the sophistication of medieval Hindu temple art.",
    images: imgs("khajuraho"),
  },
  {
    id: "kerala-backwaters",
    name: "Kerala Backwaters",
    category: "Nature",
    rating: 4.8,
    shortDescription: "Network of lagoons, lakes, and canals along the coast.",
    about:
      "The Kerala backwaters are a chain of brackish lagoons and lakes linked by canals, running parallel to the Arabian Sea. Houseboat cruises, village life, and coconut groves define the experience. The ecosystem supports fishing and agriculture and is one of India's most distinctive natural and cultural landscapes.",
    images: imgs("kerala-backwaters"),
  },
  {
    id: "munnar",
    name: "Munnar, Kerala",
    category: "Nature",
    rating: 4.8,
    shortDescription: "Tea plantations and cool hills in the Western Ghats.",
    about:
      "Munnar is a hill station in the Western Ghats, known for tea estates established in the late 19th century. The landscape of rolling green hills, Neelakurinji blooms, and wildlife sanctuaries attracts nature lovers. It remains a major tea-producing region and a popular retreat from the plains.",
    images: imgs("munnar"),
  },
  {
    id: "rishikesh",
    name: "Rishikesh, Uttarakhand",
    category: "Spiritual",
    rating: 4.7,
    shortDescription: "Yoga capital and gateway to the Himalayas on the Ganges.",
    about:
      "Rishikesh sits at the foothills of the Himalayas where the Ganges leaves the mountains. It is known for ashrams, yoga centres, and as the gateway to Char Dham pilgrimages. Adventure activities such as rafting and bungee jumping have grown alongside its spiritual reputation.",
    images: imgs("rishikesh"),
  },
  {
    id: "haridwar",
    name: "Haridwar, Uttarakhand",
    category: "Spiritual",
    rating: 4.7,
    shortDescription: "Sacred city where the Ganges enters the plains.",
    about:
      "Haridwar is one of the seven holiest cities in Hinduism. The evening Ganga Aarti at Har Ki Pauri draws thousands. The city is a gateway to pilgrimage sites in Uttarakhand and hosts the Kumbh Mela every 12 years. It has been a centre of devotion and learning for centuries.",
    images: imgs("haridwar"),
  },
  {
    id: "amritsar",
    name: "Amritsar, Punjab",
    category: "Spiritual",
    rating: 4.8,
    shortDescription: "Home of the Golden Temple and Sikh faith.",
    about:
      "Amritsar is the spiritual and cultural centre of Sikhism. The Harmandir Sahib (Golden Temple) was built in the 16th century and is the holiest gurdwara. The city also has the Jallianwala Bagh memorial and the Wagah border ceremony. It attracts pilgrims and visitors from around the world.",
    images: imgs("amritsar"),
  },
  {
    id: "ajanta-ellora",
    name: "Ajanta & Ellora Caves, Maharashtra",
    category: "History",
    rating: 4.9,
    shortDescription: "Rock-cut Buddhist, Hindu, and Jain cave monuments.",
    about:
      "The Ajanta Caves (2nd century BCE–6th century CE) contain Buddhist paintings and sculpture. The Ellora Caves (6th–10th centuries) include Buddhist, Hindu, and Jain temples carved from rock, including the Kailasa temple. Both are UNESCO World Heritage Sites and masterpieces of Indian art.",
    images: imgs("ajanta-ellora"),
  },
  {
    id: "goa",
    name: "Goa",
    category: "Beaches",
    rating: 4.7,
    shortDescription: "Beaches, Portuguese heritage, and laid-back coastal life.",
    about:
      "Goa was a Portuguese colony for over 450 years until 1961. Its beaches, churches, and Indo-Portuguese architecture attract tourists from India and abroad. The state blends Hindu and Catholic traditions, seafood cuisine, and a relaxed coastal culture. It is one of India's top beach and heritage destinations.",
    images: imgs("goa"),
  },
  {
    id: "darjeeling",
    name: "Darjeeling, West Bengal",
    category: "Mountains",
    rating: 4.8,
    shortDescription: "Tea gardens, toy train, and views of Kanchenjunga.",
    about:
      "Darjeeling is a hill station in the Eastern Himalayas, famous for tea, the Darjeeling Himalayan Railway (a UNESCO World Heritage Site), and views of Kanchenjunga. The town was developed by the British in the 19th century and remains a popular retreat with a distinct cultural mix.",
    images: imgs("darjeeling"),
  },
  {
    id: "leh-ladakh",
    name: "Leh-Ladakh",
    category: "Mountains",
    rating: 4.9,
    shortDescription: "High-altitude desert, monasteries, and mountain passes.",
    about:
      "Ladakh is a high-altitude region in the northern Indian Himalayas, with Leh as its main town. Buddhist monasteries, stark landscapes, and high passes such as Khardung La draw adventurers and culture travellers. The region was opened to tourism in the 1970s and is known for sustainable and responsible tourism initiatives.",
    images: imgs("leh-ladakh"),
  },
  {
    id: "shimla",
    name: "Shimla, Himachal Pradesh",
    category: "Mountains",
    rating: 4.7,
    shortDescription: "Former summer capital with colonial buildings and hills.",
    about:
      "Shimla was the summer capital of British India from 1864. The Mall, Christ Church, and Victorian-era buildings define its character. It remains the capital of Himachal Pradesh and a major hill station for holidays, trekking, and winter tourism.",
    images: imgs("shimla"),
  },
  {
    id: "manali",
    name: "Manali, Himachal Pradesh",
    category: "Mountains",
    rating: 4.7,
    shortDescription: "Gateway to Rohtang Pass and adventure activities.",
    about:
      "Manali lies in the Kullu Valley and is a base for skiing, trekking, and trips to Rohtang Pass and Solang Valley. The town has temples, apple orchards, and a mix of backpacker and resort tourism. It is one of the most visited hill stations in North India.",
    images: imgs("manali"),
  },
  {
    id: "mumbai",
    name: "Mumbai, Maharashtra",
    category: "Cities",
    rating: 4.7,
    shortDescription: "India's financial capital, Bollywood, and Gateway of India.",
    about:
      "Mumbai is India's most populous city and its financial and entertainment hub. The Gateway of India, Chhatrapati Shivaji Terminus, and Marine Drive are landmarks. The city is the centre of the Hindi film industry (Bollywood) and has a diverse, fast-paced urban culture.",
    images: imgs("mumbai"),
  },
  {
    id: "delhi",
    name: "Delhi",
    category: "Cities",
    rating: 4.7,
    shortDescription: "Capital city with Mughal and British-era monuments.",
    about:
      "Delhi has been a major political centre for centuries. It includes Old Delhi (Red Fort, Jama Masjid, bazaars) and New Delhi (Rashtrapati Bhavan, India Gate). The city blends Mughal, colonial, and modern architecture and is the seat of the Government of India.",
    images: imgs("delhi"),
  },
  {
    id: "bangalore",
    name: "Bengaluru, Karnataka",
    category: "Cities",
    rating: 4.7,
    shortDescription: "Garden City and India's tech hub.",
    about:
      "Bengaluru (Bangalore) is the capital of Karnataka and India's leading technology hub. The city has a moderate climate, parks, and a mix of historic sites and modern campuses. It is known for startups, IT, and a cosmopolitan culture that draws professionals and tourists alike.",
    images: imgs("bangalore"),
  },
  {
    id: "madurai",
    name: "Madurai, Tamil Nadu",
    category: "Spiritual",
    rating: 4.8,
    shortDescription: "Temple city and home of Meenakshi Amman Temple.",
    about:
      "Madurai is one of the oldest continuously inhabited cities in India. The Meenakshi Amman Temple is a vast Dravidian complex with gopurams and halls. The city has been a centre of Tamil culture, religion, and learning for over two millennia and remains a major pilgrimage destination.",
    images: imgs("madurai"),
  },
  {
    id: "konark",
    name: "Konark Sun Temple, Odisha",
    category: "History",
    rating: 4.8,
    shortDescription: "13th-century Sun Temple in the form of a chariot.",
    about:
      "The Konark Sun Temple was built in the 13th century by King Narasimhadeva I. The temple is designed as a giant chariot for the sun god Surya, with stone wheels and sculptures. It is a UNESCO World Heritage Site and a masterpiece of Odisha's temple architecture.",
    images: imgs("konark"),
  },
  {
    id: "fatehpur-sikri",
    name: "Fatehpur Sikri, Uttar Pradesh",
    category: "History",
    rating: 4.7,
    shortDescription: "Mughal capital city built by Akbar.",
    about:
      "Fatehpur Sikri was built by the Mughal emperor Akbar as his capital in the late 16th century. The complex includes the Buland Darwaza, Jama Masjid, and palaces. The city was abandoned soon after due to water shortage. It is a UNESCO World Heritage Site and a fine example of Mughal planning and architecture.",
    images: imgs("fatehpur-sikri"),
  },
  {
    id: "coorg",
    name: "Coorg, Karnataka",
    category: "Nature",
    rating: 4.8,
    shortDescription: "Coffee plantations, misty hills, and Kodava culture.",
    about:
      "Coorg (Kodagu) is a district in the Western Ghats known for coffee and pepper plantations, waterfalls, and forest reserves. The Kodava people have a distinct culture and cuisine. The region offers trekking, wildlife, and homestays and is a popular escape from Bengaluru.",
    images: imgs("coorg"),
  },
  {
    id: "andaman",
    name: "Andaman and Nicobar Islands",
    category: "Beaches",
    rating: 4.8,
    shortDescription: "Pristine beaches, coral reefs, and colonial history.",
    about:
      "The Andaman and Nicobar Islands lie in the Bay of Bengal. They offer clear waters, diving, and beaches such as Radhanagar. The islands have a colonial past (Cellular Jail at Port Blair) and unique tribal communities. Tourism is regulated to protect ecology and indigenous people.",
    images: imgs("andaman"),
  },
  {
    id: "meghalaya",
    name: "Meghalaya",
    category: "Nature",
    rating: 4.8,
    shortDescription: "Living root bridges, waterfalls, and wettest places on Earth.",
    about:
      "Meghalaya is a state in Northeast India known for Cherrapunji and Mawsynram, among the wettest places on Earth. The living root bridges of the Khasi Hills are grown from rubber fig trees. The state has waterfalls, caves, and a distinct matrilineal culture. Ecotourism and trekking are growing.",
    images: imgs("meghalaya"),
  },
  {
    id: "tirupati",
    name: "Tirupati, Andhra Pradesh",
    category: "Spiritual",
    rating: 4.8,
    shortDescription: "Venkateswara Temple and one of the busiest pilgrimage sites.",
    about:
      "Tirupati is home to the Sri Venkateswara Temple at Tirumala, one of the richest and most visited Hindu temples. The temple is on the Seven Hills and draws millions of devotees each year. The town is a major pilgrimage centre in South India with a long history of patronage and devotion.",
    images: imgs("tirupati"),
  },
  {
    id: "jaisalmer",
    name: "Jaisalmer, Rajasthan",
    category: "Cities",
    rating: 4.7,
    shortDescription: "Golden City in the Thar Desert with fort and havelis.",
    about:
      "Jaisalmer rises from the Thar Desert with a living fort, havelis, and camel safaris. The city was a trading post on caravan routes. Its yellow sandstone buildings give it the name Golden City. Desert camps and cultural festivals make it a highlight of Rajasthan tourism.",
    images: imgs("jaisalmer"),
  },
  {
    id: "jodhpur",
    name: "Jodhpur, Rajasthan",
    category: "Cities",
    rating: 4.7,
    shortDescription: "Blue City dominated by Mehrangarh Fort.",
    about:
      "Jodhpur is the second-largest city in Rajasthan. Mehrangarh Fort overlooks the blue-painted old city. The old town has markets, step wells, and palaces. Jodhpur is a gateway to the desert and is known for handicrafts, festivals, and heritage hotels.",
    images: imgs("jodhpur"),
  },
  {
    id: "valley-of-flowers",
    name: "Valley of Flowers, Uttarakhand",
    category: "Nature",
    rating: 4.8,
    shortDescription: "UNESCO park with alpine meadows and endemic flowers.",
    about:
      "The Valley of Flowers National Park is a high-altitude meadow in the Himalayas, designated a UNESCO World Heritage Site. It blooms with hundreds of species of alpine flowers in the monsoon. The park is linked to Hindu mythology and is reached by trek from Govindghat. Access is seasonal.",
    images: imgs("valley-of-flowers"),
  },
  {
    id: "kolkata",
    name: "Kolkata, West Bengal",
    category: "Cities",
    rating: 4.6,
    shortDescription: "Former colonial capital with literature, art, and culture.",
    about:
      "Kolkata was the capital of British India until 1911. The city is known for the Howrah Bridge, Victoria Memorial, Durga Puja, and a strong tradition of literature, theatre, and art. Street food, trams, and colonial buildings define its character. It remains the cultural capital of East India.",
    images: imgs("kolkata"),
  },
  {
    id: "chennai",
    name: "Chennai, Tamil Nadu",
    category: "Cities",
    rating: 4.6,
    shortDescription: "Gateway to South India with temples and Marina Beach.",
    about:
      "Chennai is the capital of Tamil Nadu and a major port and industrial city. The Kapaleeshwarar Temple, Fort St George, and Marina Beach are landmarks. The city is a centre of Carnatic music, Bharatanatyam, and Tamil cinema (Kollywood) and is the gateway to Tamil Nadu's temples and hill stations.",
    images: imgs("chennai"),
  },
  {
    id: "hyderabad",
    name: "Hyderabad, Telangana",
    category: "Cities",
    rating: 4.6,
    shortDescription: "City of Pearls with Charminar and biryani.",
    about:
      "Hyderabad was the capital of the Nizams of Hyderabad and is now the capital of Telangana. The Charminar, Golconda Fort, and Hussain Sagar are key landmarks. The city is known for pearls, biryani, and a blend of Telugu and Deccani culture. It is also a major IT and pharma hub.",
    images: imgs("hyderabad"),
  },
];

/** All categories for filter UI; "All" is a special value. */
export const EXPLORE_CATEGORIES = ["All", "Beaches", "Mountains", "Cities", "Nature", "Spiritual", "History", "Adventure"] as const;

export function getDestinationById(id: string): Destination | undefined {
  return destinations.find((d) => d.id === id);
}
