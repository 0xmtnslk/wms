import { db } from "./db";
import bcrypt from "bcrypt";
import { 
  users, hospitals, roles, userHospitals, userRoles,
  wasteTypes, locationCategories, locations, wasteCollections, wasteTypeCosts
} from "@shared/schema";
import { sql } from "drizzle-orm";

const SALT_ROUNDS = 10;

const realHospitals = [
  { id: 1, name: "İstinye Üniversitesi Liv Hospital Bahçeşehir", shortName: "İSÜ Liv Bahçeşehir", address: "Aşık Veysel, Süleyman Demirel Cd. No:1, 34517", district: "Esenyurt", city: "İstanbul" },
  { id: 2, name: "İstinye Üniversitesi Liv Hospital Topkapı", shortName: "İSÜ Liv Topkapı", address: "Maltepe Mah Edirne Çırpıcı Yolu Sk. No:9; 34010", district: "Zeytinburnu", city: "İstanbul" },
  { id: 3, name: "İstinye Üniversitesi Medical Park Gaziosmanpaşa Hastanesi", shortName: "İSÜ MP Gaziosmanpaşa", address: "Merkez, Çukurçeşme Cd. No:57 D:59, 34250", district: "Gaziosmanpaşa", city: "İstanbul" },
  { id: 4, name: "Liv Hospital Ankara", shortName: "Liv Ankara", address: "Kavaklıdere, Bestekar Sok. No:8 06680", district: "Çankaya", city: "Ankara" },
  { id: 5, name: "Liv Hospital Gaziantep", shortName: "Liv Gaziantep", address: "Seyrantepe, Abdulkadir Konukoğlu Cd No:1 27080", district: "Şehitkamil", city: "Gaziantep" },
  { id: 6, name: "Liv Hospital Samsun", shortName: "Liv Samsun", address: "Hançerli, Fatih Sultan Mehmet Cd No:155 55020", district: "İlkadım", city: "Samsun" },
  { id: 7, name: "Liv Hospital Ulus", shortName: "Liv Ulus", address: "Ahmet Adnan Saygun Cad. Canan Sok. No:5 34340", district: "Beşiktaş", city: "İstanbul" },
  { id: 8, name: "Liv Hospital Vadistanbul", shortName: "Liv Vadi", address: "Ayazağa Mahallesi, Kemerburgaz Caddesi, Vadistanbul Park Etabı, 7F Blok 34396", district: "Sarıyer", city: "İstanbul" },
  { id: 9, name: "Medical Park Adana Hastanesi", shortName: "MP Adana", address: "Büyükşehir, Çınarlı Atatürk Cd., Belediye Karşısı No:23, 01060", district: "Seyhan", city: "Adana" },
  { id: 10, name: "Medical Park Ankara (Batıkent) Hastanesi", shortName: "MP Ankara", address: "Kent Koop Mh. 1868. Sk, Batıkent Blv. NO:15 06680", district: "Yenimahalle", city: "Ankara" },
  { id: 11, name: "Medical Park İncek Hastanesi", shortName: "MP İncek", address: "Kızılcaşar Mahallesi 2744 Sokak, İncek Şht. Savcı Mehmet Selim Kiraz Blv No:1, 06830", district: "Gölbaşı", city: "Ankara" },
  { id: 12, name: "Medical Park Antalya Hastanesi", shortName: "MP Antalya", address: "Fener, Tekelioğlu Cd. No:7, 07160", district: "Muratpaşa", city: "Antalya" },
  { id: 13, name: "Medical Park Ataşehir Hastanesi", shortName: "MP Ataşehir", address: "Kayışdağı, Raci Cd. No:1, 34755", district: "Ataşehir", city: "İstanbul" },
  { id: 14, name: "Medical Park Bahçelievler Hastanesi", shortName: "MP Bahçelievler", address: "Bahçelievler Mahallesi, E-5 Karayolu / Kültür Sok No:1, 34180", district: "Bahçelievler", city: "İstanbul" },
  { id: 15, name: "Medical Park Gebze Hastanesi", shortName: "MP Gebze", address: "Güzeller, Kavak Cd. No:5, 41400", district: "Gebze", city: "Kocaeli" },
  { id: 16, name: "Medical Park Göztepe Hastanesi", shortName: "MP Göztepe", address: "E5 Üzeri, Merdivenköy, Nisan Sk. No:17, 34732", district: "Kadıköy", city: "İstanbul" },
  { id: 17, name: "Medical Park İzmir Hastanesi", shortName: "MP İzmir", address: "Kahramanlar Mh., 1397. Sk. No:1, 35230", district: "Konak", city: "İzmir" },
  { id: 18, name: "Medical Park Ordu Hastanesi", shortName: "MP Ordu", address: "Akyazı, Şht. Ali Gaffar Okkan CD. No:9, 52200", district: "Altınordu", city: "Ordu" },
  { id: 19, name: "Medical Park Seyhan Hastanesi", shortName: "MP Seyhan", address: "Namık Kemal, Mustafa Kemal Paşa Blv. No:15, 01140", district: "Seyhan", city: "Adana" },
  { id: 20, name: "Medical Park Tem Hastanesi", shortName: "MP Tem", address: "Yunus Emre, Lütfi Aykaç Blv. No:80 D:G, 34260", district: "Sultangazi", city: "İstanbul" },
  { id: 21, name: "Medical Park Tokat Hastanesi", shortName: "MP Tokat", address: "Yeşilırmak Mah. Vali Zekai Gümüşdiş Cad. No:29", district: "Merkez", city: "Tokat" },
  { id: 22, name: "Medical Park Karadeniz Hastanesi", shortName: "MP Karadeniz", address: "İnönü, Yavuz Selim Blv. No:190, 61040", district: "Ortahisar", city: "Trabzon" },
  { id: 23, name: "Medical Park Yıldızlı Hastanesi", shortName: "MP Yıldızlı", address: "Yıldızlı Beldesi, Merkez Mahallesi, Devlet Sahil Yolu Caddesi, No:46", district: "Akçaabat", city: "Trabzon" },
  { id: 24, name: "VM Medical Park Ankara (Keçiören) Hastanesi", shortName: "VM MP Ankara", address: "Kalaba Mh. 30 Sk. No: 5, 06120", district: "Keçiören", city: "Ankara" },
  { id: 25, name: "VM Medical Park Bursa Hastanesi", shortName: "VM MP Bursa", address: "Kırcaali, Fevzi Çakmak Cd. No:76, 16220", district: "Osmangazi", city: "Bursa" },
  { id: 26, name: "VM Medical Park Gebze (Fatih) Hastanesi", shortName: "VM MP Fatih", address: "Osman Yılmaz, Mh., İstanbul Cd. No:26, 41400", district: "Gebze", city: "Kocaeli" },
  { id: 27, name: "VM Medical Park Florya Hastanesi", shortName: "VM MP Florya", address: "Florya, Beşyol, Akasya Sk. No:4 D:1, 34295", district: "Küçükçekmece", city: "İstanbul" },
  { id: 28, name: "VM Medical Park Kocaeli Hastanesi", shortName: "VM MP Kocaeli", address: "Ovacık, D100 Üstü No:34, 41140", district: "Başiskele", city: "Kocaeli" },
  { id: 29, name: "VM Medical Park Maltepe Hastanesi", shortName: "VM MP Maltepe", address: "Cevizli, Bağdat Cd. No:547, 34846", district: "Maltepe", city: "İstanbul" },
  { id: 30, name: "VM Medical Park Mersin Hastanesi", shortName: "VM MP Mersin", address: "Atatürk, Gazi Mustafa Kemal Blv. No:676, 33200", district: "Mezitli", city: "Mersin" },
  { id: 31, name: "VM Medical Park Pendik Hastanesi", shortName: "VM MP Pendik", address: "Fevzi Çakmak Mah. Cemal Gürsel cad. d100 karayolu No:9 34899", district: "Pendik", city: "İstanbul" },
  { id: 32, name: "VM Medical Park Samsun Hastanesi", shortName: "VM MP Samsun", address: "Mimar Sinan Mah. Alparslan Bulvarı, No: 17", district: "Atakum", city: "Samsun" },
  { id: 33, name: "İstinye Dental Hospital", shortName: "İstinye Dent", address: "Ayazağa, Defne Sk. No:1 D:34408, 34408", district: "Sarıyer", city: "İstanbul" }
];

const hospitalColors = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#e11d48",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1",
  "#14b8a6", "#eab308", "#a855f7", "#22c55e", "#0ea5e9",
  "#d946ef", "#f43f5e", "#64748b", "#059669", "#7c3aed",
  "#0891b2", "#ca8a04", "#c026d3", "#16a34a", "#0284c7",
  "#a21caf", "#dc2626", "#475569", "#047857", "#6d28d9",
  "#0e7490", "#a16207", "#9333ea"
];

export async function seedDatabase() {
  console.log("Seeding database...");

  try {
    const existingRoles = await db.select().from(roles);
    if (existingRoles.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    const [hqRole] = await db.insert(roles).values({
      name: "HQ",
      description: "Genel Merkez - Tüm hastaneleri görür"
    }).returning();

    const [managerRole] = await db.insert(roles).values({
      name: "HOSPITAL_MANAGER",
      description: "Hastane Yöneticisi - Kendi hastanesini görür"
    }).returning();

    const [collectorRole] = await db.insert(roles).values({
      name: "COLLECTOR",
      description: "Saha Personeli - Atık toplama işlemleri"
    }).returning();

    const insertedHospitals: any[] = [];
    for (let i = 0; i < realHospitals.length; i++) {
      const h = realHospitals[i];
      const [hospital] = await db.insert(hospitals).values({
        code: `H${h.id}`,
        name: h.name,
        colorHex: hospitalColors[i % hospitalColors.length],
        isActive: true
      }).returning();
      insertedHospitals.push(hospital);
    }

    const hashedPassword = await bcrypt.hash("123456", SALT_ROUNDS);

    const [hqAdmin] = await db.insert(users).values({
      username: "hq.admin",
      password: hashedPassword,
      email: "hq@isgmed.com",
      firstName: "Genel Merkez",
      lastName: "Admin",
      isActive: true,
      sourceSystem: "local"
    }).returning();

    await db.insert(userRoles).values([
      { userId: hqAdmin.id, roleId: hqRole.id },
      { userId: hqAdmin.id, roleId: managerRole.id },
      { userId: hqAdmin.id, roleId: collectorRole.id },
    ]);

    for (const hospital of insertedHospitals) {
      await db.insert(userHospitals).values({
        userId: hqAdmin.id,
        hospitalId: hospital.id,
        isDefault: hospital.code === "H1"
      });
    }

    const managerNames = [
      ["Ahmet", "Yılmaz"], ["Mehmet", "Kaya"], ["Ali", "Demir"], ["Mustafa", "Çelik"],
      ["Hasan", "Şahin"], ["Hüseyin", "Yıldız"], ["İbrahim", "Öztürk"], ["Osman", "Aydın"],
      ["Yusuf", "Arslan"], ["Murat", "Doğan"], ["Emre", "Kılıç"], ["Can", "Aslan"],
      ["Burak", "Çetin"], ["Serkan", "Koç"], ["Onur", "Kurt"], ["Cem", "Özkan"],
      ["Kemal", "Şen"], ["Fatih", "Korkmaz"], ["Uğur", "Kaplan"], ["Erdem", "Yavuz"],
      ["Tolga", "Polat"], ["Barış", "Erdoğan"], ["Volkan", "Güler"], ["Selim", "Aktaş"],
      ["Deniz", "Tekin"], ["Kaan", "Ünal"], ["Baran", "Sezer"], ["Arda", "Kara"],
      ["Ege", "Aksoy"], ["Alp", "Çakır"], ["Tuna", "Yalçın"], ["Doruk", "Özdemir"],
      ["Efe", "Bayrak"]
    ];

    const collectorNames = [
      ["Veli", "Akın"], ["Kerem", "Bulut"], ["Cenk", "Duman"], ["Eren", "Güneş"],
      ["Ferhat", "Işık"], ["Gökhan", "Yücel"], ["Harun", "Zengin"], ["İlker", "Acar"],
      ["Kadir", "Bektaş"], ["Levent", "Candan"], ["Metin", "Durak"], ["Nihat", "Elmas"],
      ["Orhan", "Fırat"], ["Pınar", "Gül"], ["Recep", "Han"], ["Sami", "İnce"],
      ["Tamer", "Jena"], ["Umut", "Kalkan"], ["Vedat", "Lale"], ["Yavuz", "Mert"],
      ["Zafer", "Naz"], ["Adem", "Oral"], ["Bilal", "Parlak"], ["Cihan", "Reis"],
      ["Dursun", "Sağlam"], ["Engin", "Taş"], ["Ferit", "Uygun"], ["Güven", "Vural"],
      ["Halil", "Yaman"], ["İsmail", "Zaman"], ["Koray", "Alkan"], ["Levent", "Bircan"],
      ["Melih", "Ceylan"]
    ];

    const insertedManagers: any[] = [];
    const insertedCollectors: any[] = [];

    for (let i = 0; i < insertedHospitals.length; i++) {
      const hospital = insertedHospitals[i];
      const hNum = i + 1;
      const mName = managerNames[i] || ["Manager", `${hNum}`];
      const cName = collectorNames[i] || ["Collector", `${hNum}`];

      const [manager] = await db.insert(users).values({
        username: `manager.h${hNum}`,
        password: hashedPassword,
        email: `manager.h${hNum}@isgmed.com`,
        firstName: mName[0],
        lastName: mName[1],
        isActive: true,
        sourceSystem: "local"
      }).returning();
      insertedManagers.push(manager);

      const [collector] = await db.insert(users).values({
        username: `collector.h${hNum}`,
        password: hashedPassword,
        email: `collector.h${hNum}@isgmed.com`,
        firstName: cName[0],
        lastName: cName[1],
        isActive: true,
        sourceSystem: "local"
      }).returning();
      insertedCollectors.push(collector);

      await db.insert(userRoles).values([
        { userId: manager.id, roleId: managerRole.id },
        { userId: manager.id, roleId: collectorRole.id },
        { userId: collector.id, roleId: collectorRole.id },
      ]);

      await db.insert(userHospitals).values([
        { userId: manager.id, hospitalId: hospital.id, isDefault: true },
        { userId: collector.id, hospitalId: hospital.id, isDefault: true },
      ]);
    }

    const [medicalType] = await db.insert(wasteTypes).values({
      code: "medical",
      name: "Tıbbi Atık",
      colorHex: "#e11d48",
      costPerKg: "15.00",
      isActive: true
    }).returning();

    const [hazardousType] = await db.insert(wasteTypes).values({
      code: "hazardous",
      name: "Tehlikeli Atık",
      colorHex: "#f59e0b",
      costPerKg: "25.00",
      isActive: true
    }).returning();

    const [domesticType] = await db.insert(wasteTypes).values({
      code: "domestic",
      name: "Evsel Atık",
      colorHex: "#64748b",
      costPerKg: "2.00",
      isActive: true
    }).returning();

    const [recycleType] = await db.insert(wasteTypes).values({
      code: "recycle",
      name: "Geri Dönüşüm",
      colorHex: "#06b6d4",
      costPerKg: "-1.00",
      isActive: true
    }).returning();

    const categoryData = [
      { code: "icu", name: "Yoğun Bakım", unit: "Yatış Gün", referenceWasteFactor: "2.5" },
      { code: "service", name: "Hasta Servisi", unit: "Yatış Gün", referenceWasteFactor: "1.2" },
      { code: "or", name: "Ameliyathane", unit: "Ameliyat", referenceWasteFactor: "6.0" },
      { code: "polyclinic", name: "Poliklinik", unit: "Protokol", referenceWasteFactor: "0.3" },
      { code: "office", name: "İdari Ofis", unit: "Sabit", referenceWasteFactor: "0.1" },
      { code: "other", name: "Diğer / Tanımsız", unit: "Sabit", referenceWasteFactor: "1.0" }
    ];

    const insertedCategories = await db.insert(locationCategories).values(categoryData).returning();
    const catMap = Object.fromEntries(insertedCategories.map(c => [c.code, c.id]));

    const locationData = [
      { code: "AMELIYATHANE-ODA1", categoryCode: "or", customLabel: "Ana Bina 1. Kat" },
      { code: "AMELIYATHANE-ODA2", categoryCode: "or", customLabel: "Ana Bina 1. Kat" },
      { code: "ACIL-TRIYAJ", categoryCode: "polyclinic", customLabel: "Acil Girişi" },
      { code: "ACIL-MUDAHALE", categoryCode: "polyclinic", customLabel: "Kırmızı Alan" },
      { code: "LAB-BIYOKIMYA", categoryCode: "other", customLabel: "Zemin Kat Laboratuvar" },
      { code: "POLIKLINIK-KBB", categoryCode: "polyclinic", customLabel: "Poliklinik Blok B" },
      { code: "YOGUNBAKIM-YB1", categoryCode: "icu", customLabel: "Cerrahi Yoğun Bakım" },
      { code: "STERILIZASYON-1", categoryCode: "other", customLabel: "-2. Kat" },
      { code: "OFIS-IDARI", categoryCode: "office", customLabel: "Başhekimlik Katı" },
      { code: "SERVIS-DAHILIYE-1", categoryCode: "service", customLabel: "3. Kat Yataklı Servis" }
    ];

    for (const hospital of insertedHospitals) {
      for (const loc of locationData) {
        await db.insert(locations).values({
          hospitalId: hospital.id,
          code: loc.code,
          categoryId: catMap[loc.categoryCode],
          customLabel: loc.customLabel,
          isActive: true
        });
      }
    }

    const allTypes = [medicalType, hazardousType, domesticType, recycleType];
    
    for (let i = 0; i < 100; i++) {
      const hospitalIndex = Math.floor(Math.random() * insertedHospitals.length);
      const hospital = insertedHospitals[hospitalIndex];
      const collector = insertedCollectors[hospitalIndex];
      const wasteType = allTypes[Math.floor(Math.random() * allTypes.length)];
      const weight = (Math.random() * 20 + 1).toFixed(3);
      const hours = Math.floor(Math.random() * 24);
      const date = new Date();
      date.setHours(hours, Math.floor(Math.random() * 60));
      date.setDate(date.getDate() - Math.floor(Math.random() * 14));

      await db.insert(wasteCollections).values({
        hospitalId: hospital.id,
        wasteTypeId: wasteType.id,
        tagCode: `TAG-${Date.now().toString(36).toUpperCase()}${i}`,
        collectedByUserId: collector.id,
        collectedAt: date,
        weighedAt: Math.random() > 0.3 ? date : null,
        status: Math.random() > 0.3 ? "completed" : "pending",
        weightKg: Math.random() > 0.3 ? weight : null,
        isManualWeight: true
      });
    }

    await db.insert(wasteTypeCosts).values([
      { wasteTypeId: medicalType.id, effectiveFrom: "2025-01-01", costPerKg: "15.00" },
      { wasteTypeId: hazardousType.id, effectiveFrom: "2025-01-01", costPerKg: "25.00" },
      { wasteTypeId: domesticType.id, effectiveFrom: "2025-01-01", costPerKg: "2.00" },
      { wasteTypeId: recycleType.id, effectiveFrom: "2025-01-01", costPerKg: "-1.00" },
    ]);

    console.log("Database seeded successfully!");
    console.log(`Created ${insertedHospitals.length} hospitals`);
    console.log(`Created ${insertedManagers.length} managers`);
    console.log(`Created ${insertedCollectors.length} collectors`);
    console.log("Admin user: hq.admin / 123456");
  } catch (error) {
    console.error("Seed error:", error);
  }
}
