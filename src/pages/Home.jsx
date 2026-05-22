import { Link } from 'react-router-dom';
import Chatbot from '../components/Chatbot';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="relative">
      {/* Welcome Message */}
      {user && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl overflow-hidden border border-blue-100">
            <div className="relative z-10 p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center transform hover:scale-105 transition-all duration-300">
                    <span className="text-2xl">👋</span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Welcome back, {user.name}!
                    </h1>
                    <p className="text-gray-600">
                      Ready to continue your learning journey?
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Link
                    to="/quiz"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-300"
                  >
                    Take Quiz
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    to="/studyplan"
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 transform hover:scale-105 transition-all duration-300"
                  >
                    View Study Plan
                  </Link>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Last Score</div>
                    <div className="text-base font-semibold text-gray-900">85%</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Study Time</div>
                    <div className="text-base font-semibold text-gray-900">12h 30m</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Progress</div>
                    <div className="text-base font-semibold text-gray-900">75%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative min-h-[90vh] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent animate-pulse" />
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between min-h-[90vh] py-20">
            {/* Left Content */}
            <div className="flex-1 space-y-8 text-center lg:text-left">
              <div className="inline-block">
                <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white/10 backdrop-blur-sm text-white border border-white/20">
                  <span className="flex h-2 w-2 mr-2">
                    <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  AI-Powered Student Performance Prediction
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
                <span className="block text-white">Transform Education</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-white/80">
                  with AI Insights
                </span>
              </h1>
              
              <p className="text-xl text-white/90 max-w-2xl mx-auto lg:mx-0">
                Unlock the power of machine learning to predict student performance and create personalized learning experiences that drive academic success.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to={user ? "/quiz" : "/signup"}
                  className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-base font-medium rounded-lg text-indigo-600 bg-white hover:bg-white/90 transform hover:scale-105 transition-all duration-300 shadow-lg shadow-white/20"
                >
                  {user ? "Take Quiz" : "Get Started"}
                  <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                {!user && (
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-8 py-4 border border-white/30 text-base font-medium rounded-lg text-white bg-white/10 hover:bg-white/20 transform hover:scale-105 transition-all duration-300"
                  >
                    Sign In
                  </Link>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-12">
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 transform hover:scale-105 transition-all duration-300">
                  <div className="text-3xl font-bold text-white">98%</div>
                  <div className="text-sm text-white/80">Accuracy Rate</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 transform hover:scale-105 transition-all duration-300">
                  <div className="text-3xl font-bold text-white">10K+</div>
                  <div className="text-sm text-white/80">Students</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 transform hover:scale-105 transition-all duration-300">
                  <div className="text-3xl font-bold text-white">24/7</div>
                  <div className="text-sm text-white/80">Support</div>
                </div>
              </div>
            </div>

            {/* Right Image */}
            <div className="flex-1 mt-12 lg:mt-0 lg:pl-12">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-white/10 rounded-2xl blur-3xl transform -rotate-6" />
                <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20 transform hover:scale-[1.02] transition-all duration-300">
                  <img
                    src="/images/hero-image.avif"
                    alt="Student Performance Prediction"
                    className="w-full h-[500px] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/80 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-semibold tracking-wide uppercase">
              Features
            </h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to predict student performance
            </p>
          </div>

          <div className="mt-16">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              {/* Feature 1 */}
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Data Analysis</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Advanced analytics to understand student performance patterns and trends. Our AI-powered system provides deep insights into learning behaviors.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Fast Predictions</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Quick and accurate predictions using state-of-the-art machine learning models. Get instant insights to help students improve their performance.
                </p>
              </div>

              {/* Feature 3 - AI Study Plan */}
              <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">AI Study Plan</h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  Get personalized study plans powered by AI to optimize your learning journey. Our system adapts to your needs and learning style.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Us Section */}
      <div className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-primary font-semibold tracking-wide uppercase">About Us</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Our Story
            </p>
          </div>

          <div className="mt-16 grid gap-12 md:grid-cols-2">
            {/* Mission and Vision */}
            <div className="space-y-12">
              <div className="bg-white p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Our Mission</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  We are dedicated to revolutionizing education through AI-powered solutions that help students achieve their full potential. Our mission is to make quality education accessible and personalized for every learner.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Our Vision</h3>
                </div>
                <p className="text-lg text-gray-600 leading-relaxed">
                  To create a world where every student has access to personalized learning experiences powered by artificial intelligence, enabling them to reach their academic goals and unlock their full potential.
                </p>
              </div>
            </div>

            {/* Team and Technology */}
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Expert Team</h3>
                <p className="text-gray-600 leading-relaxed">
                  Our team consists of experienced educators, data scientists, and AI experts working together to create innovative solutions. We combine educational expertise with cutting-edge technology to deliver the best learning experience.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Cutting-Edge Technology</h3>
                <p className="text-gray-600 leading-relaxed">
                  We leverage the latest advancements in AI and machine learning to provide accurate predictions and personalized recommendations. Our technology stack is constantly evolving to stay at the forefront of educational innovation.
                </p>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Student-Centric Approach</h3>
                <p className="text-gray-600 leading-relaxed">
                  Everything we do is focused on helping students succeed and reach their academic goals. We believe in putting students first and creating solutions that truly make a difference in their learning journey.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Us Section */}
      <div className="py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-primary font-semibold tracking-wide uppercase">Contact Us</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Get in Touch
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
              Have questions or feedback? We'd love to hear from you!
            </p>
          </div>

          <div className="mt-16 grid gap-12 md:grid-cols-2">
            {/* Contact Information */}
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Email</h3>
                    <p className="mt-1 text-lg text-gray-600">support@LearnAheadAI.com</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Phone</h3>
                    <p className="mt-1 text-lg text-gray-600">+91 8446102366</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-2xl shadow-lg transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Address</h3>
                    <p className="mt-1 text-lg text-gray-600">MIT Academy of Engineering, Alandi, Pune</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h3>
              <form className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Subject</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Subject"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Your message"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Chatbot />

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold">LearnAhead AI</h3>
              <p className="text-gray-400">
                Empowering students with AI-driven learning solutions for academic success.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z"/>
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/" className="text-gray-400 hover:text-white transition-colors duration-300">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/quiz" className="text-gray-400 hover:text-white transition-colors duration-300">
                    Take Quiz
                  </Link>
                </li>
                <li>
                  <Link to="/prediction" className="text-gray-400 hover:text-white transition-colors duration-300">
                    Performance Prediction
                  </Link>
                </li>
                <li>
                  <Link to="/studyplan" className="text-gray-400 hover:text-white transition-colors duration-300">
                    Study Plan
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/ai-study-plan" className="text-gray-400 hover:text-white transition-colors duration-300">
                    AI Study Plan
                  </Link>
                </li>
                <li>
                  <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors duration-300">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="text-gray-400 hover:text-white transition-colors duration-300">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link to="/test" className="text-gray-400 hover:text-white transition-colors duration-300">
                    Tests
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <svg className="h-6 w-6 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-400">MIT Academy of Engineering, Alandi, Pune</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-400">support@LearnAheadAI.com</span>
                </li>
                <li className="flex items-center">
                  <svg className="h-6 w-6 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-gray-400">+91 8446102366</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-gray-700 text-center">
            <p className="text-gray-400">
              © {new Date().getFullYear()} LearnAhead AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 