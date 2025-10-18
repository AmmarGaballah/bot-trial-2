import { motion } from 'framer-motion';
import { Users, Mail, Globe, Heart, Award, Zap, Shield, Target } from 'lucide-react';
import GlassCard from '../components/GlassCard';

const About = () => {
  const founders = [
    {
      name: 'Ahmed Hassan',
      role: 'CEO & Co-Founder',
      image: '👨‍💼',
      bio: 'Visionary leader with 10+ years in AI and automation',
      email: 'ahmed@aisalescommander.com',
      linkedin: '#'
    },
    {
      name: 'Sarah Johnson',
      role: 'CTO & Co-Founder',
      image: '👩‍💻',
      bio: 'Expert in machine learning and scalable architectures',
      email: 'sarah@aisalescommander.com',
      linkedin: '#'
    },
    {
      name: 'Michael Chen',
      role: 'CPO & Co-Founder',
      image: '👨‍🎨',
      bio: 'Product strategist passionate about user experience',
      email: 'michael@aisalescommander.com',
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
    { number: '10K+', label: 'Active Users' },
    { number: '99.9%', label: 'Uptime' },
    { number: '50M+', label: 'Messages Processed' },
    { number: '150+', label: 'Countries' }
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
          Revolutionizing sales automation with the power of artificial intelligence
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
              Founded in 2024, <span className="text-blue-400 font-semibold">AI Sales Commander</span> was born from a simple yet powerful vision: 
              to empower businesses with intelligent automation that transforms how they connect with customers.
            </p>
            <p>
              We recognized that traditional sales processes were time-consuming, inefficient, and often missed opportunities. 
              Our team of AI experts, engineers, and sales professionals came together to create a solution that leverages 
              the latest advancements in artificial intelligence and machine learning.
            </p>
            <p>
              Today, we serve thousands of businesses worldwide, helping them automate customer communication, 
              manage orders seamlessly, and grow their sales exponentially. Our platform integrates with major e-commerce 
              platforms and social media channels, providing a unified hub for all your sales operations.
            </p>
            <p className="text-purple-400 font-semibold">
              Our mission is simple: Make AI-powered sales automation accessible to businesses of all sizes.
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

      {/* Co-Founders Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-8 h-8 text-pink-400" />
            <h2 className="text-3xl font-bold text-white">Meet Our Co-Founders</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {founders.map((founder, index) => (
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
                      {founder.image}
                    </motion.div>
                    
                    {/* Info */}
                    <div>
                      <h3 className="text-2xl font-bold text-white">{founder.name}</h3>
                      <p className="text-purple-400 font-semibold">{founder.role}</p>
                      <p className="text-gray-400 mt-2 text-sm">{founder.bio}</p>
                    </div>
                    
                    {/* Contact */}
                    <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/10">
                      <a
                        href={`mailto:${founder.email}`}
                        className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 transition-colors"
                        title="Email"
                      >
                        <Mail className="w-5 h-5 text-blue-400" />
                      </a>
                      <a
                        href={founder.linkedin}
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
            <Heart className="w-16 h-16 text-pink-400 mx-auto" />
            <h2 className="text-3xl font-bold text-white">Our Dedication</h2>
            <div className="max-w-3xl mx-auto space-y-4 text-gray-300 text-lg">
              <p className="italic">
                "We dedicate this platform to every entrepreneur, small business owner, and sales professional 
                who dreams of scaling their business without sacrificing personal connections with their customers."
              </p>
              <p>
                Our team works tirelessly to ensure that <span className="text-purple-400 font-semibold">AI Sales Commander</span> remains 
                at the forefront of innovation, continuously evolving to meet your needs. We're committed to your success, 
                and we measure our achievements by the growth and satisfaction of our users.
              </p>
              <p className="text-pink-400 font-bold text-xl mt-6">
                Thank you for trusting us with your business. Together, we're building the future of sales automation.
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
        <p>© 2024 AI Sales Commander. All rights reserved.</p>
        <p className="text-sm mt-2">Made with ❤️ by a team passionate about your success</p>
      </motion.div>
    </div>
  );
};

export default About;
