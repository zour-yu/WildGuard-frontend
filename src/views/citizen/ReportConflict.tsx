import React, { useState, useRef } from 'react';
import { ChevronLeft, Info, Camera, MapPin, Send, X, AlertCircle, User, ShieldCheck } from 'lucide-react';

export default function ReportConflict() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Elephant Sighting');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const LOCATIONS = [
    'Sector 1: Northern Ridge',
    'Sector 2: Reservoir Basin',
    'Sector 4: Farmland 8A Buffer',
    'Sector 5: Western Settlement Buffer',
    'Sector 6: Eastern Transit Corridor'
  ];
  const [location, setLocation] = useState(LOCATIONS[2]);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: 'Elephant Sighting', label: 'Elephant Sighting', hasWarning: false },
    { id: 'Crop Damage', label: 'Crop Damage', hasWarning: false },
    { id: 'Injury / Danger', label: 'Injury / Danger', hasWarning: true },
    { id: 'Other', label: 'Other', hasWarning: false },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };
  
  const handleReport = async () => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('category', selectedCategory);
      formData.append('description', description);
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('location', location);
      
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      await fetch('http://localhost:5000/api/conflicts/report', {
        method: 'POST',
        body: formData // Note: We do NOT set Content-Type header; fetch sets multipart/form-data boundary automatically
      });
      
      alert('Report submitted successfully! Field Rangers have been notified.');
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setDescription('');
      setName('');
      setPhone('');
      setLocation(LOCATIONS[2]);
      setSelectedCategory('Elephant Sighting');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e) {
      console.error(e);
      alert('Failed to send report. Please use SMS fallback if urgent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-32">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Report a Sighting</h1>
        <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 transition-colors">
          <Info className="w-5 h-5" />
        </button>
      </header>

      <main className="px-4 py-5 max-w-xl mx-auto space-y-8">
        
        {/* SMS Warning Banner */}
        <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-snug">
            No smartphone or 4G data? Send <span className="bg-amber-200/70 px-1.5 py-0.5 rounded font-bold text-amber-950 mx-0.5">ELEPHANT + your village</span> to <span className="font-bold">1919</span> (SMS Hotline)
          </p>
        </div>

        {/* Categories Section */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 tracking-wider mb-3">WHAT ARE YOU REPORTING?</h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`py-3.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#003823] text-white border-[#003823] shadow-md shadow-[#003823]/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {cat.hasWarning && (
                  <span className={`w-2 h-2 rounded-full ${selectedCategory === cat.id ? 'bg-red-400' : 'bg-red-500'}`}></span>
                )}
                {cat.label}
                {selectedCategory === cat.id && !cat.hasWarning && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-1 text-emerald-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Situation Details */}
        <section>
          <div className="flex justify-between items-baseline mb-3">
            <h2 className="text-xs font-bold text-slate-500 tracking-wider">SITUATION DETAILS / MESSAGE</h2>
            <span className="text-[11px] text-slate-400">Optional</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm focus-within:border-[#003823] focus-within:ring-1 focus-within:ring-[#003823] transition-all">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Herd of 3 elephants spotted moving near eastern paddy fields, breaking banana trees..."
              className="w-full p-4 h-28 resize-none focus:outline-none text-sm text-slate-700 placeholder-slate-400"
            ></textarea>
            <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex items-center">
              <span className="text-xs text-slate-400">Be descriptive for the wildlife team</span>
            </div>
          </div>
        </section>

        {/* Contact Details */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 tracking-wider mb-3">YOUR CONTACT DETAILS</h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            <div className="flex items-center px-3 border-b border-slate-100">
              <User className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name (e.g. W. Fernando)"
                className="w-full py-3.5 text-sm focus:outline-none text-slate-700 placeholder-slate-400"
              />
            </div>
            <div className="flex items-center">
              <div className="flex items-center gap-2 px-4 py-3.5 border-r border-slate-100 bg-slate-50 rounded-bl-xl text-sm font-semibold text-slate-700">
                <span className="text-lg leading-none">🇱🇰</span>
                +94
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="077 123 4567"
                className="w-full px-4 py-3.5 text-sm focus:outline-none text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>
          <div className="flex items-start gap-2 mt-3 px-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed">
              Used strictly by field rangers to confirm location & dispatch alerts.
            </p>
          </div>
        </section>

        {/* Photo Upload Area */}
        <section>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          {previewUrl ? (
            <div className="w-full h-48 border border-slate-200 rounded-3xl relative overflow-hidden group shadow-sm bg-slate-100">
              <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => { setSelectedFile(null); setPreviewUrl(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 backdrop-blur-sm transition-colors shadow-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-[#003823] transition-all group bg-white shadow-sm"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-emerald-50 flex items-center justify-center mb-2 transition-colors">
                <Camera className="w-5 h-5 text-slate-500 group-hover:text-[#003823]" />
              </div>
              <span className="text-sm font-bold text-slate-700 group-hover:text-[#003823]">Add a photo <span className="font-normal text-slate-400">(optional)</span></span>
              <span className="text-xs text-slate-400 mt-1">JPEG, PNG up to 10MB</span>
            </button>
          )}
        </section>

        {/* Location Selector */}
        <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <label className="text-xs font-bold text-slate-500 tracking-wider mb-2 block">SELECT INCIDENT LOCATION</label>
          <div className="relative">
            <MapPin className="w-5 h-5 text-[#003823] absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#003823]/50 appearance-none"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
        </section>

      </main>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 pb-8 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="max-w-xl mx-auto w-full">
          <button 
            onClick={handleReport}
            disabled={isSubmitting}
            className={`w-full text-white font-bold py-4 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
              isSubmitting ? 'bg-[#003823]/70 cursor-wait' : 'bg-[#003823] hover:bg-[#002819] hover:shadow-xl hover:shadow-[#003823]/20'
            }`}
          >
            <Send className={`w-5 h-5 ${isSubmitting ? 'animate-pulse' : ''}`} />
            <span className="text-base tracking-wide">
              {isSubmitting ? 'Sending Report...' : 'Send Report'}
            </span>
          </button>
        </div>
      </div>

    </div>
  );
}
