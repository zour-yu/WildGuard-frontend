import React, { useState } from 'react';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ShieldCheck, Mail, Lock, User, ArrowRight, AlertCircle, ChevronLeft } from 'lucide-react';

export default function CitizenAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('Colombo');
  const [province, setProvince] = useState('Western');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      }

      const token = await userCredential.user.getIdToken();
      
      // Sync user with backend
      await fetch('http://localhost:5000/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firebaseId: userCredential.user.uid,
          email: userCredential.user.email,
          name: isLogin ? undefined : name,
          address: isLogin ? undefined : address,
          district: isLogin ? undefined : district,
          province: isLogin ? undefined : province,
          role: 'Citizen'
        })
      });

      localStorage.setItem('userType', 'Citizen');
      window.location.href = '/';
    } catch (err: any) {
      // Clean up Firebase error messages
      const msg = err.message.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, '');
      setError(msg || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button onClick={() => window.history.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-600 hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-900">{isLogin ? 'Citizen Login' : 'Create Account'}</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 px-4 py-10 max-w-xl mx-auto w-full flex flex-col justify-center">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-50 text-[#003823] rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">WildGuard Community</h2>
          <p className="text-slate-500 text-sm">Join the community network to protect your village and wildlife.</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium flex gap-3 items-start mb-6 border border-red-100">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-2">Full Name</label>
                <div className="bg-white border border-slate-200 rounded-2xl p-1 shadow-sm focus-within:border-[#003823] focus-within:ring-1 focus-within:ring-[#003823] transition-all">
                  <div className="flex items-center px-4">
                    <User className="w-5 h-5 text-slate-400 mr-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. W. Fernando"
                      className="w-full py-4 text-sm focus:outline-none text-slate-700 placeholder-slate-400 bg-transparent"
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-2">Home Address</label>
                <div className="bg-white border border-slate-200 rounded-2xl p-1 shadow-sm focus-within:border-[#003823] focus-within:ring-1 focus-within:ring-[#003823] transition-all">
                  <div className="flex items-center px-4">
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, City/Village"
                      className="w-full py-4 text-sm focus:outline-none text-slate-700 placeholder-slate-400 bg-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-2">District</label>
                  <div className="bg-white border border-slate-200 rounded-2xl p-1 shadow-sm focus-within:border-[#003823] focus-within:ring-1 focus-within:ring-[#003823] transition-all">
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full py-4 px-4 text-sm focus:outline-none text-slate-700 bg-transparent appearance-none"
                    >
                      <option value="Ampara">Ampara</option>
                      <option value="Anuradhapura">Anuradhapura</option>
                      <option value="Badulla">Badulla</option>
                      <option value="Batticaloa">Batticaloa</option>
                      <option value="Colombo">Colombo</option>
                      <option value="Galle">Galle</option>
                      <option value="Gampaha">Gampaha</option>
                      <option value="Hambantota">Hambantota</option>
                      <option value="Jaffna">Jaffna</option>
                      <option value="Kalutara">Kalutara</option>
                      <option value="Kandy">Kandy</option>
                      <option value="Kegalle">Kegalle</option>
                      <option value="Kilinochchi">Kilinochchi</option>
                      <option value="Kurunegala">Kurunegala</option>
                      <option value="Mannar">Mannar</option>
                      <option value="Matale">Matale</option>
                      <option value="Matara">Matara</option>
                      <option value="Moneragala">Moneragala</option>
                      <option value="Mullaitivu">Mullaitivu</option>
                      <option value="Nuwara Eliya">Nuwara Eliya</option>
                      <option value="Polonnaruwa">Polonnaruwa</option>
                      <option value="Puttalam">Puttalam</option>
                      <option value="Ratnapura">Ratnapura</option>
                      <option value="Trincomalee">Trincomalee</option>
                      <option value="Vavuniya">Vavuniya</option>
                    </select>
                  </div>
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-2">Province</label>
                  <div className="bg-white border border-slate-200 rounded-2xl p-1 shadow-sm focus-within:border-[#003823] focus-within:ring-1 focus-within:ring-[#003823] transition-all">
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full py-4 px-4 text-sm focus:outline-none text-slate-700 bg-transparent appearance-none"
                    >
                      <option value="Central">Central</option>
                      <option value="Eastern">Eastern</option>
                      <option value="North Central">North Central</option>
                      <option value="Northern">Northern</option>
                      <option value="North Western">North Western</option>
                      <option value="Sabaragamuwa">Sabaragamuwa</option>
                      <option value="Southern">Southern</option>
                      <option value="Uva">Uva</option>
                      <option value="Western">Western</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-2">Email Address</label>
            <div className="bg-white border border-slate-200 rounded-2xl p-1 shadow-sm focus-within:border-[#003823] focus-within:ring-1 focus-within:ring-[#003823] transition-all">
              <div className="flex items-center px-4">
                <Mail className="w-5 h-5 text-slate-400 mr-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full py-4 text-sm focus:outline-none text-slate-700 placeholder-slate-400 bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-2">Password</label>
            <div className="bg-white border border-slate-200 rounded-2xl p-1 shadow-sm focus-within:border-[#003823] focus-within:ring-1 focus-within:ring-[#003823] transition-all">
              <div className="flex items-center px-4">
                <Lock className="w-5 h-5 text-slate-400 mr-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full py-4 text-sm focus:outline-none text-slate-700 placeholder-slate-400 bg-transparent"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`w-full text-white font-bold py-4 mt-6 h-14 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[0.98] ${
              loading ? 'bg-[#003823]/70 cursor-wait' : 'bg-[#003823] hover:bg-[#002819] hover:shadow-xl hover:shadow-[#003823]/20'
            }`}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-semibold text-slate-500 hover:text-[#003823] transition-colors p-2 rounded-lg hover:bg-emerald-50"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
    </div>
  );
}
