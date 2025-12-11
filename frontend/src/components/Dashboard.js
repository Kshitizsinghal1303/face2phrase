import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  LogOut, 
  Settings, 
  Play, 
  FileText, 
  Clock, 
  Award, 
  TrendingUp,
  Calendar,
  BarChart3,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { getCurrentUser, logoutUser } from '../utils/auth';
import toast from 'react-hot-toast';

const Dashboard = ({ onLogout, onStartInterview }) => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [interviewHistory, setInterviewHistory] = useState([]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    
    // Load interview history from localStorage
    const history = JSON.parse(localStorage.getItem('interview_history') || '[]');
    setInterviewHistory(history);
  }, []);

  const handleLogout = () => {
    logoutUser();
    toast.success('Logged out successfully');
    onLogout();
  };

  const stats = [
    {
      title: 'Total Interviews',
      value: interviewHistory.length,
      icon: FileText,
      color: 'from-blue-500 to-blue-600',
      change: '+12%'
    },
    {
      title: 'Average Score',
      value: interviewHistory.length > 0 ? 
        Math.round(interviewHistory.reduce((acc, curr) => acc + (curr.score || 75), 0) / interviewHistory.length) + '%' : 
        'N/A',
      icon: Award,
      color: 'from-green-500 to-green-600',
      change: '+5%'
    },
    {
      title: 'Time Practiced',
      value: Math.round(interviewHistory.length * 15) + 'm',
      icon: Clock,
      color: 'from-purple-500 to-purple-600',
      change: '+8%'
    },
    {
      title: 'Improvement',
      value: '+15%',
      icon: TrendingUp,
      color: 'from-orange-500 to-orange-600',
      change: '+3%'
    }
  ];

  const recentInterviews = interviewHistory.slice(-5).reverse();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-lg border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Face2Phrase</h1>
                  <p className="text-sm text-white/60">AI Interview Assistant</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 text-white">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">{user?.fullName}</p>
                  <p className="text-xs text-white/60">@{user?.username}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Welcome Section */}
          <motion.div variants={itemVariants} className="text-center">
            <h2 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user?.fullName?.split(' ')[0]}! 👋
            </h2>
            <p className="text-white/70 text-lg">
              Ready to ace your next interview? Let's get started!
            </p>
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants} className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartInterview}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 flex items-center space-x-3"
            >
              <Play className="w-6 h-6" />
              <span>Start New Interview</span>
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </motion.div>

          {/* Stats Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.title}
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:border-white/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-green-400 text-sm font-medium">{stat.change}</span>
                </div>
                <h3 className="text-white/70 text-sm font-medium mb-1">{stat.title}</h3>
                <p className="text-white text-2xl font-bold">{stat.value}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Interviews */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Recent Interviews</span>
                </h3>
                <button className="text-purple-400 hover:text-purple-300 text-sm font-medium">
                  View All
                </button>
              </div>
              
              {recentInterviews.length > 0 ? (
                <div className="space-y-4">
                  {recentInterviews.map((interview, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{interview.position || 'Software Engineer'}</p>
                          <p className="text-white/60 text-sm">{interview.date || 'Today'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold">{interview.score || 75}%</p>
                        <p className="text-white/60 text-sm">Score</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">No interviews yet</p>
                  <p className="text-white/40 text-sm">Start your first interview to see history here</p>
                </div>
              )}
            </div>

            {/* Performance Chart Placeholder */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Performance Trends</span>
                </h3>
              </div>
              
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/60">Performance analytics</p>
                <p className="text-white/40 text-sm">Complete more interviews to see trends</p>
              </div>
            </div>
          </motion.div>

          {/* Tips Section */}
          <motion.div variants={itemVariants} className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Award className="w-5 h-5" />
              <span>Interview Tips</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-purple-300" />
                </div>
                <h4 className="text-white font-medium mb-2">Be Yourself</h4>
                <p className="text-white/70 text-sm">Authenticity resonates better than perfection</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-purple-300" />
                </div>
                <h4 className="text-white font-medium mb-2">Practice Regularly</h4>
                <p className="text-white/70 text-sm">Consistent practice builds confidence</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-500/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-6 h-6 text-purple-300" />
                </div>
                <h4 className="text-white font-medium mb-2">Learn & Improve</h4>
                <p className="text-white/70 text-sm">Review feedback to enhance performance</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;