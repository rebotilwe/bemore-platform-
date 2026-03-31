import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
});

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export async function getSetting(key, defaultValue = null) {
  const doc = await SiteSettings.findOne({ key }).lean();
  return doc ? doc.value : defaultValue;
}

export async function setSetting(key, value) {
  await SiteSettings.findOneAndUpdate(
    { key },
    { value, updatedAt: new Date() },
    { upsert: true },
  );
}

export async function getAllSettings() {
  const docs = await SiteSettings.find().lean();
  return Object.fromEntries(docs.map(d => [d.key, d.value]));
}

export default SiteSettings;
