import { FaXTwitter, FaInstagram } from 'react-icons/fa6';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Button } from './ui/button';

export default function ContactPage({ onClose }) {
  // Format nomor telepon untuk WhatsApp (hapus spasi, tanda hubung, dan karakter non-digit)
  const whatsappNumber = '6281222337568'; // +62 812-2233-7568 → 6281222337568
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: '#bfddf8' }}>
      <div className="min-h-screen flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-6xl">
          {/* Content */}
          <div className="text-center space-y-6 md:space-y-8">
            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">
                Hubungi Kami
              </h1>
              <p className="text-sm md:text-base text-gray-700">
                Dapatkan informasi terbaru tentang banjir di Sumatra
              </p>
            </div>

            {/* Two Column Layout - Desktop: Side by side, Mobile: Stacked */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 max-w-md md:max-w-lg lg:max-w-none mx-auto">
              {/* Left Column: Social Media */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 md:mb-6">
                  Media Sosial
                </h2>

                {/* Kawal Banjir Sumatra Logo */}
                <div className="flex flex-col items-center mb-4 md:mb-6">
                  <img
                    src="/logo.png"
                    alt="Kawal Banjir Sumatra"
                    className="h-16 md:h-20 w-auto mb-2"
                  />
                  <p className="text-base md:text-lg font-semibold text-gray-700 italic">
                    Stay Informed, Stay Safe
                  </p>
                </div>

                <div className="space-y-3 md:space-y-4">
                  {/* X (Twitter) */}
                  <a
                    href="https://x.com/KawalSumatra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 p-3 md:p-4 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-colors group"
                  >
                    <FaXTwitter className="h-5 w-5 md:h-6 md:w-6 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span className="font-medium text-sm md:text-base">@KawalSumatra</span>
                  </a>

                  {/* Instagram */}
                  <a
                    href="https://instagram.com/kawalbanjirsumatra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 p-3 md:p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-colors group"
                  >
                    <FaInstagram className="h-5 w-5 md:h-6 md:w-6 group-hover:scale-110 transition-transform flex-shrink-0" />
                    <span className="font-medium text-sm md:text-base">@kawalbanjirsumatra</span>
                  </a>
                </div>
              </div>

              {/* Right Column: About Us */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 md:p-8 shadow-xl">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-4 md:mb-6">
                  Tentang Kami
                </h2>
                <div className="space-y-4 md:space-y-6">
                  {/* ISH Technologies Logo */}
                  <div className="flex flex-col items-center gap-3 md:gap-4">
                    <a
                      href="https://ish-technologies.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src="/ish/logo.png"
                        alt="ISH Technologies"
                        className="h-12 md:h-16 w-auto"
                      />
                    </a>

                    <div className="text-center">
                      <a
                        href="https://ish-technologies.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <p className="text-base md:text-lg text-gray-700 leading-relaxed max-w-xs md:max-w-sm mx-auto">
                          Indonesia based Enterprise AI & Software Development partner that empowers you to make a difference
                        </p>
                      </a>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 md:space-y-3 pt-2 md:pt-4 border-t border-gray-200">
                    {/* Email */}
                    <a
                      href="mailto:partnership@ish-technologies.com"
                      className="flex items-center gap-3 text-gray-700 hover:text-blue-700 transition-colors group"
                    >
                      <Mail className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-xs md:text-sm break-all">partnership@ish-technologies.com</span>
                    </a>

                    {/* WhatsApp */}
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-gray-700 hover:text-green-700 transition-colors group"
                    >
                      <Phone className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-xs md:text-sm">+62 812-2233-7568</span>
                    </a>

                    {/* Location */}
                    <div className="flex items-center gap-3 text-gray-700">
                      <MapPin className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                      <span className="text-xs md:text-sm">Jakarta, Indonesia</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Button */}
            <div className="pt-4">
              <Button
                onClick={onClose}
                className="bg-white/90 hover:bg-white text-gray-900 font-semibold px-6 md:px-8 py-2 md:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm md:text-base"
              >
                Kembali Memantau Bencana
              </Button>
            </div>

            {/* Footer */}
            <div className="text-xs md:text-sm text-gray-600 pt-2">
              <p>© 2025 Kawal Banjir Sumatra. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
