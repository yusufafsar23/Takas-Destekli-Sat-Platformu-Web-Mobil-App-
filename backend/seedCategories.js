const mongoose = require('mongoose');
const Category = require('./models/Category');
const User = require('./models/User');
const dotenv = require('dotenv');
const slugify = require('slugify');

// Load env vars
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Categories to seed
const categories = [
  { name: 'Elektronik', description: 'Elektronik cihazlar ve parçalar' },
  { name: 'Giyim', description: 'Erkek, kadın ve çocuk giyim eşyaları' },
  { name: 'Ev Eşyaları', description: 'Mobilya, ev dekorasyonu ve diğer ev eşyaları' },
  { name: 'Spor ve Outdoor', description: 'Spor ekipmanları ve açık hava malzemeleri' },
  { name: 'Hobi ve Oyun', description: 'Koleksiyon, oyun ve hobi ürünleri' },
  { name: 'Kitap, Film, Müzik', description: 'Kitaplar, filmler, müzik ve diğer medya' },
  { name: 'Otomobil ve Parçaları', description: 'Otomobil parçaları ve aksesuarları' },
  { name: 'Bahçe', description: 'Bahçe mobilyaları, aletleri ve bitkileri' },
  { name: 'Bebek ve Çocuk', description: 'Bebek ve çocuk ürünleri' },
  { name: 'Diğer', description: 'Diğer kategorilere uymayan ürünler' }
];

// Subcategories
const subcategories = {
  'Elektronik': [
    'Bilgisayarlar',
    'Telefonlar',
    'Televizyonlar',
    'Ses Sistemleri',
    'Fotoğraf ve Kamera'
  ],
  'Giyim': [
    'Kadın Giyim',
    'Erkek Giyim',
    'Çocuk Giyim',
    'Ayakkabılar',
    'Aksesuarlar'
  ],
  'Ev Eşyaları': [
    'Mobilya',
    'Mutfak Eşyaları',
    'Yatak ve Banyo',
    'Dekorasyon',
    'Aydınlatma'
  ]
};

async function seedCategories() {
  try {
    // Find admin user (or create one if needed)
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      // Create a generic admin user if none exists
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123456',
        firstName: 'Admin',
        lastName: 'User',
        fullName: 'Admin User',
        role: 'admin'
      });
      console.log('Created admin user');
    }
    
    // Clear existing categories
    await Category.deleteMany({});
    console.log('Cleared existing categories');
    
    // Add main categories
    const categoryMap = {};
    
    for (const category of categories) {
      const slug = slugify(category.name, {
        lower: true,
        strict: true,
        remove: /[*+~.()'"!:@]/g
      });
      
      const newCategory = await Category.create({
        name: category.name,
        slug,
        description: category.description,
        createdBy: adminUser._id
      });
      
      categoryMap[category.name] = newCategory._id;
      console.log(`Created category: ${category.name}`);
    }
    
    // Add subcategories
    for (const [parentName, subs] of Object.entries(subcategories)) {
      const parentId = categoryMap[parentName];
      
      if (parentId) {
        for (const subName of subs) {
          const slug = slugify(subName, {
            lower: true,
            strict: true,
            remove: /[*+~.()'"!:@]/g
          });
          
          await Category.create({
            name: subName,
            slug,
            description: `${subName} kategorisi`,
            parentId,
            createdBy: adminUser._id
          });
          
          console.log(`Created subcategory: ${subName} under ${parentName}`);
        }
      }
    }
    
    console.log('Categories seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

// Run the seed function
seedCategories(); 