import Navbar from './Navbar'

const Footer = () => (
  <footer className="border-t border-white/5 mt-20 py-8 text-center">
    <p className="font-display text-2xl text-ice/10 tracking-widest">FIFA WORLD CUP 2026</p>
    <p className="text-ice/20 text-xs mt-2">USA · CANADA · MEXICO</p>
  </footer>
)

const Layout = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
      {children}
    </main>
    <Footer />
  </div>
)

export default Layout
