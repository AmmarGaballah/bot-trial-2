import { motion } from 'framer-motion';
import { Users, Mail, Globe, Heart, Award, Zap, Shield, Target } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const About = () => {
  const founder = {
    name: 'Mahmoud Aboelros',
    role: 'Founder & CEO',
    image: '👑',
    bio: 'Visionary entrepreneur on a mission to democratize AI-powered sales automation',
    email: 'mahmoud@aisalescommander.com',
    linkedin: '#'
  };

  const coFounders = [
    {
      name: 'Shady Ahmed',
      role: 'Co-Founder',
      image: '👨‍💼',
      bio: 'Strategic architect building dreams from raw chaos',
      email: 'shady@aisalescommander.com',
      linkedin: '#'
    },
    {
      name: 'Idris Ghamed',
      role: 'Co-Founder',
      image: '👨‍💻',
      bio: 'Technical innovator turning midnight ideas into reality',
      email: 'idris@aisalescommander.com',
      linkedin: '#'
    },
    {
      name: 'Ayman Ali',
      role: 'Co-Founder',
      image: '👨‍🔬',
      bio: 'Product visionary crafting daylight empires',
      email: 'ayman@aisalescommander.com',
      linkedin: '#'
    }
  ];

  const values = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Innovation',
      description: 'Pushing boundaries with cutting-edge AI technology'
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Trust',
      description: 'Building secure and reliable solutions for our clients'
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Excellence',
      description: 'Delivering exceptional results in every project'
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Passion',
      description: 'Driven by love for technology and customer success'
    }
  ];

  const stats = [
    { number: 'Oct 2025', label: 'Founded' },
    { number: '100%', label: 'Vision Driven' },
    { number: '24/7', label: 'AI Support' },
    { number: '∞', label: 'Possibilities' }
  ];

  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4 py-12"
      >
        <motion.h1
          className="text-6xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          About AI Sales Commander
        </motion.h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto">
          A fresh startup launched in October 2025, revolutionizing sales automation with cutting-edge AI
        </p>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="text-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + index * 0.1 }}
              >
                <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className="text-gray-400 mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Company Description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-8 h-8 text-blue-400" />
            <h2 className="text-3xl font-bold text-white">Our Story</h2>
          </div>
          <div className="space-y-4 text-gray-300 text-lg leading-relaxed">
            <p>
              Launched in <span className="text-blue-400 font-semibold">October 2025</span>, <span className="text-purple-400 font-semibold">AI Sales Commander</span> represents 
              a bold new chapter in sales automation. Born from late-night brainstorming sessions and fueled by an unwavering belief 
              that AI can revolutionize how businesses connect with their customers.
            </p>
            <p>
              We're a fresh startup with a powerful vision: to democratize AI-powered sales automation. While we're just beginning our journey, 
              our platform already integrates cutting-edge AI technology with seamless multi-channel communication. From e-commerce platforms 
              to social media, we're building the future of intelligent sales automation.
            </p>
            <p>
              Our team brings together passionate innovators, skilled engineers, and sales automation experts who believe that 
              every business—regardless of size—deserves access to enterprise-level AI tools. We're not just building software; 
              we're crafting a movement.
            </p>
            <p className="text-purple-400 font-semibold italic">
              "We're not here to follow the market—we're here to redefine it."
            </p>
            <p className="text-blue-400 font-semibold">
              Join us on this journey. We're just getting started.
            </p>
          </div>
        </GlassCard>
      </motion.div>

      {/* Core Values */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-8 h-8 text-purple-400" />
            <h2 className="text-3xl font-bold text-white">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={index}
                className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-all duration-300"
                whileHover={{ scale: 1.05, y: -5 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <div className="text-blue-400 mb-4">{value.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{value.title}</h3>
                <p className="text-gray-400">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Founder Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-8 h-8 text-yellow-400" />
            <h2 className="text-3xl font-bold text-white">Meet Our Founder</h2>
          </div>
          <div className="flex justify-center">
            <motion.div
              className="relative group w-full max-w-md"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="p-8 rounded-xl bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 backdrop-blur-sm border-2 border-yellow-500/30 hover:border-yellow-500/50 transition-all duration-300">
                <div className="text-center space-y-4">
                  {/* Avatar */}
                  <motion.div
                    className="text-9xl mx-auto w-40 h-40 flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-4 border-yellow-500/40"
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                  >
                    {founder.image}
                  </motion.div>
                  
                  {/* Info */}
                  <div>
                    <h3 className="text-3xl font-bold text-white">{founder.name}</h3>
                    <p className="text-yellow-400 font-semibold text-lg">{founder.role}</p>
                    <p className="text-gray-400 mt-3 text-base">{founder.bio}</p>
                  </div>
                  
                  {/* Contact */}
                  <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/10">
                    <a
                      href={`mailto:${founder.email}`}
                      className="p-3 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors"
                      title="Email"
                    >
                      <Mail className="w-6 h-6 text-yellow-400" />
                    </a>
                    <a
                      href={founder.linkedin}
                      className="p-3 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 transition-colors"
                      title="LinkedIn"
                    >
                      <Globe className="w-6 h-6 text-orange-400" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Co-Founders Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-8 h-8 text-pink-400" />
            <h2 className="text-3xl font-bold text-white">Meet Our Co-Founders</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {coFounders.map((cofounder, index) => (
              <motion.div
                key={index}
                className="relative group"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
              >
                <div className="p-6 rounded-xl bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-all duration-300">
                  <div className="text-center space-y-4">
                    {/* Avatar */}
                    <motion.div
                      className="text-8xl mx-auto w-32 h-32 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-4 border-purple-500/30"
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      {cofounder.image}
                    </motion.div>
                    
                    {/* Info */}
                    <div>
                      <h3 className="text-2xl font-bold text-white">{cofounder.name}</h3>
                      <p className="text-purple-400 font-semibold">{cofounder.role}</p>
                      <p className="text-gray-400 mt-2 text-sm">{cofounder.bio}</p>
                    </div>
                    
                    {/* Contact */}
                    <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/10">
                      <a
                        href={`mailto:${cofounder.email}`}
                        className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
                        title="Email"
                      >
                        <Mail className="w-5 h-5 text-blue-400" />
                      </a>
                      <a
                        href={cofounder.linkedin}
                        className="p-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 transition-colors"
                        title="LinkedIn"
                      >
                        <Globe className="w-5 h-5 text-purple-400" />
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Contact Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-8 h-8 text-green-400" />
            <h2 className="text-3xl font-bold text-white">Get In Touch</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <Mail className="w-8 h-8 text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">General Inquiries</h3>
              <a href="mailto:info@aisalescommander.com" className="text-blue-400 hover:text-blue-300">
                info@aisalescommander.com
              </a>
            </div>
            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <Mail className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Support</h3>
              <a href="mailto:support@aisalescommander.com" className="text-purple-400 hover:text-purple-300">
                support@aisalescommander.com
              </a>
            </div>
            <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <Mail className="w-8 h-8 text-pink-400 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-2">Sales</h3>
              <a href="mailto:sales@aisalescommander.com" className="text-pink-400 hover:text-pink-300">
                sales@aisalescommander.com
              </a>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Dedication Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <GlassCard className="p-8 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 border-purple-500/30">
          <div className="text-center space-y-4">
            <Heart className="w-16 h-16 text-pink-400 mx-auto animate-pulse" />
            <h2 className="text-4xl font-bold text-white mb-6">Dedication</h2>
            <div className="max-w-4xl mx-auto space-y-6 text-gray-300 text-lg leading-relaxed">
              <p>
                Sometimes you think you’ve found the one, the spark that shapes you, pushes you beyond your limits, the eternal sun you’ve been chasing. But remember this: no one alive can carve your path without your action. Others are only multipliers; you are the base. All along, you were looking into a mirror.
              </p>
              <p>
                Believe in yourself. And yet, one day, you will meet someone you don’t even know, someone who leaves a mark you cannot anticipate. Know who deserves what. Even if you find yourself in hell, your eyes can still see the stars.
              </p>
              <p>
                Love is never complete, remember, even princesses have loved fallen angels. So never see a broken heart as a loss; it’s just the beginning of another chapter. Each fatal blow, each fracture, reinforces you, building a mountain from your broken bones.
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Footer Note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-center text-gray-500 pb-8"
      >
        <p>© 2025 AI Sales Commander. All rights reserved.</p>
        <p className="text-sm mt-2">Founded October 2025 • Made with ❤️ and raw ambition</p>
      </motion.div>
    </div>
  );
};

export default About;
