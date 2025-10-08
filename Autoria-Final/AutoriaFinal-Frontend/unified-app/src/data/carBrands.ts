// Car brands data for the wizard
export interface CarBrand {
  id: string;
  name: string;
  logo: string;
  models: string[];
}

export const carBrands: CarBrand[] = [
  {
    id: 'mercedes',
    name: 'Mercedes-Benz',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Logo.svg/1200px-Mercedes-Logo.svg.png',
    models: ['C-Class', 'E-Class', 'S-Class', 'A-Class', 'G-Class', 'GLC', 'GLE', 'GLS', 'CLA', 'CLS', 'AMG GT', 'Sprinter']
  },
  {
    id: 'bmw',
    name: 'BMW',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/1200px-BMW.svg.png',
    models: ['3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X7', 'Z4', 'i3', 'i8', 'M3', 'M5']
  },
  {
    id: 'audi',
    name: 'Audi',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/1200px-Audi-Logo_2016.svg.png',
    models: ['A3', 'A4', 'A6', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'TT', 'R8', 'e-tron', 'RS6']
  },
  {
    id: 'toyota',
    name: 'Toyota',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Toyota_logo_%28v%29.svg/1200px-Toyota_logo_%28v%29.svg.png',
    models: ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius', 'Avalon', 'Sienna', 'Tacoma', 'Tundra', '4Runner', 'Land Cruiser', 'Yaris']
  },
  {
    id: 'honda',
    name: 'Honda',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Honda_Logo.svg/1200px-Honda_Logo.svg.png',
    models: ['Civic', 'Accord', 'CR-V', 'Pilot', 'HR-V', 'Passport', 'Ridgeline', 'Insight', 'Fit', 'Odyssey', 'Element', 'S2000']
  },
  {
    id: 'ford',
    name: 'Ford',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_logo_flat.svg/1200px-Ford_logo_flat.svg.png',
    models: ['F-150', 'Mustang', 'Explorer', 'Escape', 'Edge', 'Expedition', 'Bronco', 'Focus', 'Fusion', 'Ranger', 'Transit', 'EcoSport']
  },
  {
    id: 'chevrolet',
    name: 'Chevrolet',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Chevrolet_logo.svg/1200px-Chevrolet_logo.svg.png',
    models: ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Tahoe', 'Suburban', 'Camaro', 'Corvette', 'Cruze', 'Sonic', 'Spark', 'Blazer']
  },
  {
    id: 'nissan',
    name: 'Nissan',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Nissan_logo.svg/1200px-Nissan_logo.svg.png',
    models: ['Altima', 'Sentra', 'Rogue', 'Murano', 'Pathfinder', 'Armada', 'Frontier', 'Titan', '370Z', 'GT-R', 'Leaf', 'Versa']
  },
  {
    id: 'hyundai',
    name: 'Hyundai',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Hyundai_logo.svg/1200px-Hyundai_logo.svg.png',
    models: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Palisade', 'Kona', 'Veloster', 'Genesis', 'Accent', 'Venue', 'Ioniq', 'Nexo']
  },
  {
    id: 'kia',
    name: 'Kia',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Kia_logo.svg/1200px-Kia_logo.svg.png',
    models: ['Forte', 'Optima', 'Sorento', 'Sportage', 'Telluride', 'Soul', 'Stinger', 'Niro', 'Cadenza', 'Sedona', 'Rio', 'EV6']
  },
  {
    id: 'volkswagen',
    name: 'Volkswagen',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/1200px-Volkswagen_logo_2019.svg.png',
    models: ['Jetta', 'Passat', 'Golf', 'Tiguan', 'Atlas', 'Arteon', 'Beetle', 'CC', 'Touareg', 'ID.4', 'GTI', 'GLI']
  },
  {
    id: 'lexus',
    name: 'Lexus',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Lexus_logo.svg/1200px-Lexus_logo.svg.png',
    models: ['ES', 'IS', 'GS', 'LS', 'RX', 'GX', 'LX', 'NX', 'UX', 'LC', 'RC', 'CT']
  },
  {
    id: 'infiniti',
    name: 'Infiniti',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Infiniti_logo.svg/1200px-Infiniti_logo.svg.png',
    models: ['Q50', 'Q60', 'Q70', 'QX50', 'QX60', 'QX80', 'G37', 'M37', 'FX35', 'EX35', 'JX35', 'I35']
  },
  {
    id: 'acura',
    name: 'Acura',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Acura_logo.svg/1200px-Acura_logo.svg.png',
    models: ['ILX', 'TLX', 'RLX', 'RDX', 'MDX', 'NSX', 'TSX', 'TL', 'RL', 'RSX', 'Integra', 'Legend']
  },
  {
    id: 'mazda',
    name: 'Mazda',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Mazda_logo.svg/1200px-Mazda_logo.svg.png',
    models: ['Mazda3', 'Mazda6', 'CX-3', 'CX-5', 'CX-9', 'MX-5 Miata', 'RX-7', 'RX-8', 'Protege', 'Millenia', 'Tribute', 'B-Series']
  },
  {
    id: 'subaru',
    name: 'Subaru',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Subaru_logo.svg/1200px-Subaru_logo.svg.png',
    models: ['Impreza', 'Legacy', 'Outback', 'Forester', 'Ascent', 'WRX', 'BRZ', 'Crosstrek', 'Tribeca', 'Baja', 'SVX', 'Justy']
  },
  {
    id: 'volvo',
    name: 'Volvo',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Volvo_logo.svg/1200px-Volvo_logo.svg.png',
    models: ['S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90', 'C30', 'C70', 'S40', 'S80', 'V70']
  },
  {
    id: 'jaguar',
    name: 'Jaguar',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Jaguar_logo.svg/1200px-Jaguar_logo.svg.png',
    models: ['XE', 'XF', 'XJ', 'F-PACE', 'E-PACE', 'I-PACE', 'F-TYPE', 'XK', 'S-TYPE', 'X-TYPE', 'XJS', 'XJ6']
  },
  {
    id: 'landrover',
    name: 'Land Rover',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Land_Rover_logo.svg/1200px-Land_Rover_logo.svg.png',
    models: ['Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar', 'Discovery', 'Discovery Sport', 'Defender', 'Freelander', 'LR2', 'LR3', 'LR4']
  },
  {
    id: 'porsche',
    name: 'Porsche',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/50/Porsche_logo.svg/1200px-Porsche_logo.svg.png',
    models: ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman', '718', '944', '928', '968', 'Carrera GT']
  }
];

// Color options for Step 3
export const colorOptions = [
  { name: 'White', hex: '#FFFFFF', textColor: '#000000' },
  { name: 'Black', hex: '#000000', textColor: '#FFFFFF' },
  { name: 'Silver', hex: '#C0C0C0', textColor: '#000000' },
  { name: 'Gray', hex: '#808080', textColor: '#FFFFFF' },
  { name: 'Red', hex: '#FF0000', textColor: '#FFFFFF' },
  { name: 'Blue', hex: '#0000FF', textColor: '#FFFFFF' },
  { name: 'Green', hex: '#008000', textColor: '#FFFFFF' },
  { name: 'Yellow', hex: '#FFFF00', textColor: '#000000' },
  { name: 'Orange', hex: '#FFA500', textColor: '#000000' },
  { name: 'Brown', hex: '#A52A2A', textColor: '#FFFFFF' },
  { name: 'Gold', hex: '#FFD700', textColor: '#000000' },
  { name: 'Purple', hex: '#800080', textColor: '#FFFFFF' }
];

// Fuel type options
export const fuelTypeOptions = [
  { value: 'Petrol', label: 'Petrol' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'Electric', label: 'Electric' },
  { value: 'LPG', label: 'LPG' },
  { value: 'CNG', label: 'CNG' },
  { value: 'Biofuel', label: 'Biofuel' }
];

// Damage type options
export const damageTypeOptions = [
  { value: 'None', label: 'No Damage' },
  { value: 'Minor', label: 'Minor Damage' },
  { value: 'Moderate', label: 'Moderate Damage' },
  { value: 'Major', label: 'Major Damage' },
  { value: 'Severe', label: 'Severe Damage' },
  { value: 'Salvage', label: 'Salvage Title' },
  { value: 'Flood', label: 'Flood Damage' },
  { value: 'Fire', label: 'Fire Damage' },
  { value: 'Hail', label: 'Hail Damage' },
  { value: 'Accident', label: 'Accident Damage' }
];

// Body style options
export const bodyStyleOptions = [
  'Sedan', 'SUV', 'Hatchback', 'Coupe', 'Convertible', 'Wagon', 'Pickup', 'Van', 'Minivan', 'Crossover', 'Roadster', 'Truck'
];

// Currency options
export const currencyOptions = [
  { value: 'AZN', label: 'AZN (₼)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' }
];

// Mileage unit options
export const mileageUnitOptions = [
  { value: 'km', label: 'Kilometers' },
  { value: 'miles', label: 'Miles' }
];
