// دیتای مرکزی محصولات - این فایل در همه جا ایمپورت میشه
export const products = [
  {
    id: 1,
    name: 'گلدان الماس تراش',
    category: 'الماس تراش',
    price: 25000000,
    priceFormatted: '۲۵٫۰۰۰٫۰۰۰',
    oldPrice: 28000000,
    oldPriceFormatted: '۲۸٫۰۰۰٫۰۰۰',
    discount: 11,
    image: '/products/1.png',
    images: ['/products/1.png', '/products/1.png', '/products/1.png'],
    shortDesc: 'گلدان مسی با حکاکی الماس‌تراش ظریف و درخشان',
    details: 'این گلدان الماس‌تراش با استفاده از مس مرغوب و پرداخت دستی ساخته شده است. تراش‌های الماسی روی سطح باعث انعکاس خیره‌کننده نور می‌شوند و آن را به گزینه‌ای مناسب برای فضاهای لوکس تبدیل کرده است.',
    weight: '۱٫۸ کیلوگرم',
    dimensions: '۲۵ × ۱۵ سانتی‌متر',
    material: 'مس خالص با روکش طلا',
    craftsman: 'استاد محمدی',
    warranty: '۳ سال ضمانت اصالت',
    sku: 'NM-DIA-001',
    stock: 5,
    features: [
      'ساخته‌شده با مس مرغوب ایرانی',
      'تراش الماسی دستی توسط استادکاران',
      'پرداخت آینه‌ای با کیفیت بالا',
      'مناسب برای دکور لوکس و هدیه'
    ],
    colors: [
      { name: 'طلایی', value: '#d4af37' },
      { name: 'نقره‌ای', value: '#c0c0c0' },
      { name: 'مسی', value: '#b87333' }
    ],
    model: '/models/model1.glb'
  },
  {
    id: 2,
    name: 'آجیل‌خوری خاتم',
    category: 'خاتم',
    price: 12000000,
    priceFormatted: '۱۲٫۰۰۰٫۰۰۰',
    oldPrice: null,
    oldPriceFormatted: null,
    discount: 0,
    image: '/products/2.png',
    images: ['/products/2.png', '/products/2.png', '/products/2.png'],
    shortDesc: 'آجیل‌خوری خاتم تمام‌سیم با نقوش کلاسیک ایرانی',
    details: 'آجیل‌خوری خاتم‌کاری شده با نقش‌های سنتی ایرانی و استفاده از چوب، مس و استخوان. هر قطعه خاتم با ظرافت در کنار دیگری قرار گرفته تا سطحی یکدست و چشم‌نواز ایجاد شود.',
    weight: '۰٫۸ کیلوگرم',
    dimensions: '۲۰ × ۲۰ سانتی‌متر',
    material: 'چوب گردو، مس و استخوان',
    craftsman: 'استاد رضایی',
    warranty: '۲ سال ضمانت اصالت',
    sku: 'NM-KHT-002',
    stock: 8,
    features: [
      'خاتم‌کاری تمام‌سیم اصفهان',
      'استفاده از چوب گردوی کهنه',
      'نقوش هندسی اصیل ایرانی',
      'قابل شستشو با دستمال نمدار'
    ],
    colors: [],
    model: '/models/model2.glb'
  },
  {
    id: 3,
    name: 'شکلات‌خوری فیروزه',
    category: 'فیروزه کوبی',
    price: 45000000,
    priceFormatted: '۴۵٫۰۰۰٫۰۰۰',
    oldPrice: 52000000,
    oldPriceFormatted: '۵۲٫۰۰۰٫۰۰۰',
    discount: 13,
    image: '/products/3.png',
    images: ['/products/3.png', '/products/3.png', '/products/3.png'],
    shortDesc: 'فیروزه‌کوبی نیشابور روی مس با پرداخت آینه‌ای',
    details: 'استفاده از فیروزه نیشابور و چیدمان منظم آن روی بدنه مسی، این شکلات‌خوری را به اثری ارزشمند و ماندگار تبدیل کرده است. پرداخت آینه‌ای مس، درخشش فیروزه‌ها را دوچندان کرده است.',
    weight: '۲٫۳ کیلوگرم',
    dimensions: '۳۰ × ۱۸ سانتی‌متر',
    material: 'مس و فیروزه نیشابور',
    craftsman: 'استاد احمدی',
    warranty: '۳ سال ضمانت اصالت',
    sku: 'NM-FRZ-003',
    stock: 3,
    features: [
      'فیروزه طبیعی نیشابور',
      'چیدمان منظم و یکدست',
      'پرداخت آینه‌ای مس',
      'مناسب پذیرایی و دکور'
    ],
    colors: [],
    model: '/models/model3.glb'
  },
  {
    id: 4,
    name: 'تخته‌نرد گردو',
    category: 'تخته نرد',
    price: 35000000,
    priceFormatted: '۳۵٫۰۰۰٫۰۰۰',
    oldPrice: null,
    oldPriceFormatted: null,
    discount: 0,
    image: '/products/4.png',
    images: ['/products/4.png', '/products/4.png', '/products/4.png'],
    shortDesc: 'تخته‌نرد چوب گردو با منبت‌کاری و خاتم ترکیبی',
    details: 'تخته‌نردی از چوب گردوی کهنه با نقوش منبت و ریزه‌کاری خاتم. مناسب هدیه‌های خاص و استفاده در مهمانی‌های صمیمی.',
    weight: '۳٫۵ کیلوگرم',
    dimensions: '۵۰ × ۵۰ سانتی‌متر',
    material: 'چوب گردوی ایرانی',
    craftsman: 'استاد کریمی',
    warranty: '۵ سال ضمانت اصالت',
    sku: 'NM-TKH-004',
    stock: 2,
    features: [
      'چوب گردوی کهنه ایرانی',
      'منبت‌کاری دستی',
      'خاتم ترکیبی روی درب',
      'شامل مهره و تاس دست‌ساز'
    ],
    colors: [],
    model: null
  },
  {
    id: 5,
    name: 'آیینه الماس تراش',
    category: 'الماس تراش',
    price: 18000000,
    priceFormatted: '۱۸٫۰۰۰٫۰۰۰',
    oldPrice: 21000000,
    oldPriceFormatted: '۲۱٫۰۰۰٫۰۰۰',
    discount: 14,
    image: '/products/1.png',
    images: ['/products/1.png', '/products/1.png', '/products/1.png'],
    shortDesc: 'آیینه دیواری با تراش‌های الماسی و قاب دست‌ساز',
    details: 'آیینه‌ای مناسب راهروها و پذیرایی، با قاب دست‌ساز و تراش‌های الماسی که نور محیط را به زیبایی منعکس می‌کند.',
    weight: '۲٫۱ کیلوگرم',
    dimensions: '۴۰ × ۶۰ سانتی‌متر',
    material: 'مس با روکش طلا',
    craftsman: 'استاد حسینی',
    warranty: '۳ سال ضمانت اصالت',
    sku: 'NM-DIA-005',
    stock: 4,
    features: [
      'قاب مسی با روکش طلا',
      'تراش الماسی دقیق',
      'آینه بلژیکی درجه یک',
      'مناسب نصب دیواری'
    ],
    colors: [
      { name: 'طلایی', value: '#d4af37' },
      { name: 'نقره‌ای', value: '#c0c0c0' }
    ],
    model: null
  },
  {
    id: 6,
    name: 'جعبه جواهر خاتم',
    category: 'خاتم',
    price: 8500000,
    priceFormatted: '۸٫۵۰۰٫۰۰۰',
    oldPrice: null,
    oldPriceFormatted: null,
    discount: 0,
    image: '/products/2.png',
    images: ['/products/2.png', '/products/2.png', '/products/2.png'],
    shortDesc: 'جعبه جواهر خاتم‌کاری با آستر مخمل',
    details: 'جعبه جواهر کوچک با خاتم‌کاری ظریف روی درب، مناسب برای نگهداری جواهرات و وسایل ارزشمند.',
    weight: '۰٫۵ کیلوگرم',
    dimensions: '۱۵ × ۱۰ سانتی‌متر',
    material: 'چوب گردو، خاتم و مخمل',
    craftsman: 'استاد رضایی',
    warranty: '۲ سال ضمانت اصالت',
    sku: 'NM-KHT-006',
    stock: 10,
    features: [
      'خاتم‌کاری روی درب',
      'آستر مخمل نرم',
      'اندازه مناسب برای جیب',
      'قفل امن'
    ],
    colors: [],
    model: null
  },
  {
    id: 7,
    name: 'گلدان فیروزه‌کوبی بزرگ',
    category: 'فیروزه کوبی',
    price: 65000000,
    priceFormatted: '۶۵٫۰۰۰٫۰۰۰',
    oldPrice: 75000000,
    oldPriceFormatted: '۷۵٫۰۰۰٫۰۰۰',
    discount: 13,
    image: '/products/3.png',
    images: ['/products/3.png', '/products/3.png', '/products/3.png'],
    shortDesc: 'گلدان بزرگ فیروزه‌کوبی مناسب دکور لوکس',
    details: 'گلدان بزرگ با فیروزه‌کوبی گسترده، مناسب برای دکوراسیون فضاهای بزرگ و لوکس.',
    weight: '۳٫۵ کیلوگرم',
    dimensions: '۴۰ × ۲۵ سانتی‌متر',
    material: 'مس و فیروزه نیشابور',
    craftsman: 'استاد احمدی',
    warranty: '۳ سال ضمانت اصالت',
    sku: 'NM-FRZ-007',
    stock: 2,
    features: [
      'فیروزه‌کوبی گسترده',
      'مناسب فضاهای بزرگ',
      'پرداخت آینه‌ای',
      'بسیار لوکس و چشم‌نواز'
    ],
    colors: [],
    model: null
  },
  {
    id: 8,
    name: 'تخته‌نرد خاتم',
    category: 'تخته نرد',
    price: 55000000,
    priceFormatted: '۵۵٫۰۰۰٫۰۰۰',
    oldPrice: null,
    oldPriceFormatted: null,
    discount: 0,
    image: '/products/4.png',
    images: ['/products/4.png', '/products/4.png', '/products/4.png'],
    shortDesc: 'تخته‌نرد تمام خاتم با جعبه نگهداری',
    details: 'تخته‌نرد سطح خاتم، شاهکاری از هنر خاتم‌کاری اصفهان با طراحی سنتی.',
    weight: '۴ کیلوگرم',
    dimensions: '۵۰ × ۵۰ سانتی‌متر',
    material: 'چوب گردو و خاتم',
    craftsman: 'استاد کریمی',
    warranty: '۵ سال ضمانت اصالت',
    sku: 'NM-TKH-008',
    stock: 1,
    features: [
      'کل سطح خاتم‌کاری شده',
      'جعبه نگهداری چوبی',
      'مهره و تاس دست‌ساز',
      'اثر کلکسیونی'
    ],
    colors: [],
    model: null
  }
]

// دسته‌بندی‌ها
export const categories = [
  { value: 'الماس تراش', slug: 'diamond-cut', label: 'الماس تراش', icon: '◆' },
  { value: 'خاتم', slug: 'khatam', label: 'خاتم', icon: '✧' },
  { value: 'فیروزه کوبی', slug: 'turquoise', label: 'فیروزه‌کوبی', icon: '❂' },
  { value: 'تخته نرد', slug: 'backgammon', label: 'تخته‌نرد', icon: '⚅' }
]

// کمکگرها
export const getProductById = (id) => products.find(p => p.id === Number(id))
export const getProductsByCategory = (category) => products.filter(p => p.category === category)
export const getFeaturedProducts = () => products.filter(p => p.discount > 0).slice(0, 4)
export const formatPrice = (num) => num.toLocaleString('fa-IR')