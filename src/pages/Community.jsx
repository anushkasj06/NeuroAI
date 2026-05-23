import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Community = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    subject: '',
    tags: []
  });
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mock data for initial development
  useEffect(() => {
    // In a real app, this would be an API call
    const mockPosts = [
      {
        id: 1,
        title: 'Understanding AVL Tree Balancing',
        content: 'I\'m having trouble understanding how AVL trees maintain their balance after insertion. Can someone explain the rotation process with a simple example?',
        subject: 'ads',
        author: {
          id: 'user1',
          name: 'Om',
          avatar: 'https://ui-avatars.com/api/?name=Anushka+Kiran+Om&background=0D8ABC&color=fff'
        },
        createdAt: '2023-06-15T10:30:00Z',
        likes: 12,
        comments: [
          {
            id: 1,
            content: 'AVL trees use four types of rotations: Left-Left, Right-Right, Left-Right, and Right-Left. The key is to identify the imbalance pattern and apply the correct rotation.',
            author: {
              id: 'user2',
              name: 'Jay',
              avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=0D8ABC&color=fff'
            },
            createdAt: '2023-06-15T11:45:00Z',
            likes: 5
          }
        ],
        tags: ['trees', 'balancing', 'algorithms']
      },
      {
        id: 2,
        title: 'Java Thread Synchronization Issue',
        content: 'I\'m getting a ConcurrentModificationException when trying to modify a collection while iterating over it. How can I safely modify the collection during iteration?',
        subject: 'java',
        author: {
          id: 'user2',
          name: 'Anushka',
          avatar: 'https://ui-avatars.com/api/?name=Anushka+Kiran+Om&background=0D8ABC&color=fff'
        },
        createdAt: '2023-06-14T09:15:00Z',
        likes: 8,
        comments: [
          {
            id: 1,
            content: 'You can use an Iterator\'s remove() method to safely remove elements during iteration. Alternatively, you can create a new collection with the filtered elements.',
            author: {
              id: 'user3',
              name: 'jayraj',
              avatar: 'https://ui-avatars.com/api/?name=Alex+Johnson&background=0D8ABC&color=fff'
            },
            createdAt: '2023-06-14T10:20:00Z',
            likes: 3
          }
        ],
        tags: ['java', 'threading', 'concurrency']
      },
      {
        id: 3,
        title: 'Red-Black Tree Implementation',
        content: 'I\'m working on implementing a Red-Black tree for my ADS project. Can anyone share a good resource or example code for the insertion and deletion operations?',
        subject: 'ads',
        author: {
          id: 'user1',
          name: 'Anushka',
          avatar: 'https://ui-avatars.com/api/?name=Anushka+Kiran+Om&background=0D8ABC&color=fff'
        },
        createdAt: '2023-06-13T14:20:00Z',
        likes: 15,
        comments: [
          {
            id: 1,
            content: 'I recommend checking out the MIT OpenCourseWare lectures on Red-Black trees. They have excellent visualizations that make the concepts much clearer.',
            author: {
              id: 'user4',
              name: 'user',
              avatar: 'https://ui-avatars.com/api/?name=Michael+Brown&background=0D8ABC&color=fff'
            },
            createdAt: '2023-06-13T16:05:00Z',
            likes: 7
          }
        ],
        tags: ['trees', 'data-structures', 'implementation']
      },
      {
        id: 4,
        title: 'Java Stream API Performance',
        content: 'I\'ve been using Java Stream API for data processing, but I\'m concerned about performance with large datasets. Does anyone have experience optimizing Stream operations?',
        subject: 'java',
        author: {
          id: 'user2',
          name: 'Om',
          avatar: 'https://ui-avatars.com/api/?name=Anushka+Kiran+Om&background=0D8ABC&color=fff'
        },
        createdAt: '2023-06-12T11:40:00Z',
        likes: 10,
        comments: [
          {
            id: 1,
            content: 'For large datasets, consider using parallel streams with .parallelStream(). Also, be mindful of terminal operations that require multiple passes over the data.',
            author: {
              id: 'user5',
              name: 'Sarah',
              avatar: 'https://ui-avatars.com/api/?name=Sarah+Wilson&background=0D8ABC&color=fff'
            },
            createdAt: '2023-06-12T13:15:00Z',
            likes: 4
          }
        ],
        tags: ['java', 'performance', 'stream-api']
      },
      {
        id: 5,
        title: 'B-Tree vs B+ Tree',
        content: 'Can someone explain the key differences between B-Trees and B+ Trees? I understand they\'re both balanced tree data structures, but I\'m confused about when to use each one.',
        subject: 'ads',
        author: {
          id: 'user1',
          name: 'Anushka',
          avatar: 'https://ui-avatars.com/api/?name=Anushka+Kiran+Om&background=0D8ABC&color=fff'
        },
        createdAt: '2023-06-11T09:30:00Z',
        likes: 18,
        comments: [
          {
            id: 1,
            content: 'B+ Trees store all data in leaf nodes, while B-Trees store data in both internal and leaf nodes. B+ Trees are generally preferred for database indexing because they provide better sequential access.',
            author: {
              id: 'user6',
              name: 'Yash',
              avatar: 'https://ui-avatars.com/api/?name=David+Lee&background=0D8ABC&color=fff'
            },
            createdAt: '2023-06-11T10:45:00Z',
            likes: 9
          }
        ],
        tags: ['trees', 'database', 'indexing']
      }
    ];
    
    setTimeout(() => {
      setPosts(mockPosts);
      setLoading(false);
    }, 1000);
  }, []);

  const handleCreatePost = (e) => {
    e.preventDefault();
    
    // In a real app, this would be an API call
    const post = {
      id: posts.length + 1,
      title: newPost.title,
      content: newPost.content,
      subject: newPost.subject,
      author: {
        id: user?.id || 'anonymous',
        name: user?.name || 'Yash',
        avatar: user?.avatar || `https://ui-avatars.com/api/?name=Anushka+Kiran+Om&background=0D8ABC&color=fff`
      },
      createdAt: new Date().toISOString(),
      likes: 0,
      comments: [],
      tags: newPost.tags
    };
    
    setPosts([post, ...posts]);
    setNewPost({ title: '', content: '', subject: '', tags: [] });
    setIsCreatingPost(false);
  };

  const handleLikePost = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, likes: post.likes + 1 } : post
    ));
  };

  const handleLikeComment = (postId, commentId) => {
    setPosts(posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: post.comments.map(comment => 
            comment.id === commentId ? { ...comment, likes: comment.likes + 1 } : comment
          )
        };
      }
      return post;
    }));
  };

  const handleAddComment = (postId) => {
    if (!comment.trim()) return;
    
    // In a real app, this would be an API call
    const newComment = {
      id: Date.now(),
      content: comment,
      author: {
        id: user?.id || 'anonymous',
        name: user?.name || 'Anushka Kiran Om',
        avatar: user?.avatar || `https://ui-avatars.com/api/?name=Anushka+Kiran+Om&background=0D8ABC&color=fff`
      },
      createdAt: new Date().toISOString(),
      likes: 0
    };
    
    setPosts(posts.map(post => 
      post.id === postId ? { ...post, comments: [...post.comments, newComment] } : post
    ));
    
    setComment('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSubjectColor = (subject) => {
    switch(subject) {
      case 'ads': return 'bg-purple-500';
      case 'ds': return 'bg-blue-500';
      case 'am': return 'bg-green-500';
      case 'java': return 'bg-amber-500';
      case 'dbms': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getSubjectName = (subject) => {
    switch(subject) {
      case 'ads': return 'Advanced Data Structures';
      case 'ds': return 'Data Structures';
      case 'am': return 'Applied Mathematics';
      case 'java': return 'Java Programming';
      case 'dbms': return 'Database Management';
      default: return 'Other';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full text-center border border-slate-200">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-teal-700 text-white px-6 py-2 rounded-2xl hover:bg-teal-800 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-gradient-to-r from-teal-700 to-sky-600 px-6 py-8 sm:px-8">
            <h1 className="text-3xl font-extrabold text-white mb-2">Community Hub</h1>
            <p className="text-white/80 text-lg">Share your doubts, help others, and learn together</p>
          </div>

          <div className="p-6 sm:p-8">
            {!isCreatingPost ? (
              <button
                onClick={() => setIsCreatingPost(true)}
                className="mb-8 bg-gradient-to-r from-teal-700 to-sky-600 text-white px-6 py-3 rounded-2xl
                hover:from-teal-800 hover:to-sky-700 transition-all duration-200 flex items-center gap-2
                shadow-sm hover:shadow-md transform hover:-translate-y-0.5"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Create New Post
              </button>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200 mb-8">
                <div className="bg-gradient-to-r from-teal-700 to-sky-600 px-6 py-5">
                  <h2 className="text-xl font-bold text-white">Create a New Post</h2>
                </div>
                <div className="p-6">
                  <form onSubmit={handleCreatePost}>
                    <div className="mb-4">
                      <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={newPost.title}
                        onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                        className="block w-full px-4 py-2 border border-slate-200 rounded-2xl focus:ring-teal-500 focus:border-teal-500"
                        placeholder="What's your question?"
                        required
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-1">
                        Subject
                      </label>
                      <select
                        id="subject"
                        value={newPost.subject}
                        onChange={(e) => setNewPost({...newPost, subject: e.target.value})}
                        className="block w-full px-4 py-2 border border-slate-200 rounded-2xl focus:ring-teal-500 focus:border-teal-500"
                        required
                      >
                        <option value="">Select a subject</option>
                        <option value="ads">Advanced Data Structures</option>
                        <option value="ds">Data Structures</option>
                        <option value="am">Applied Mathematics</option>
                        <option value="java">Java Programming</option>
                        <option value="dbms">Database Management</option>
                      </select>
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1">
                        Content
                      </label>
                      <textarea
                        id="content"
                        value={newPost.content}
                        onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                        className="block w-full px-4 py-2 border border-slate-200 rounded-2xl focus:ring-teal-500 focus:border-teal-500"
                        rows="4"
                        placeholder="Describe your doubt in detail..."
                        required
                      ></textarea>
                    </div>
                    
                    <div className="mb-6">
                      <label htmlFor="tags" className="block text-sm font-medium text-slate-700 mb-1">
                        Tags (comma separated)
                      </label>
                      <input
                        type="text"
                        id="tags"
                        value={newPost.tags.join(', ')}
                        onChange={(e) => setNewPost({...newPost, tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)})}
                        className="block w-full px-4 py-2 border border-slate-200 rounded-2xl focus:ring-teal-500 focus:border-teal-500"
                        placeholder="e.g. algorithms, debugging, optimization"
                      />
                    </div>
                    
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsCreatingPost(false)}
                        className="px-4 py-2 border border-slate-200 rounded-2xl text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-teal-700 to-sky-600 text-white px-6 py-2 rounded-2xl
                        hover:from-teal-800 hover:to-sky-700 transition-all duration-200
                        shadow-sm hover:shadow-md"
                      >
                        Post
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                  <h3 className="text-xl font-medium text-slate-900 mb-2">No posts yet</h3>
                  <p className="text-slate-500">Be the first to share your doubt with the community!</p>
                </div>
              ) : (
                posts.map(post => (
                  <div key={post.id} className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-200 hover:shadow-md transition-shadow duration-200">
                    <div className="p-6 sm:p-7">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <img 
                            src={post.author.avatar} 
                            alt={post.author.name} 
                            className="w-10 h-10 rounded-full mr-3"
                          />
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{post.author.name}</h3>
                            <p className="text-sm text-slate-500">{formatDate(post.createdAt)}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${getSubjectColor(post.subject)}`}>
                          {getSubjectName(post.subject)}
                        </span>
                      </div>
                      
                      <h2 className="text-xl font-bold text-slate-900 mb-3">{post.title}</h2>
                      <p className="text-slate-700 mb-4 whitespace-pre-line">{post.content}</p>
                      
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                        <button 
                          onClick={() => handleLikePost(post.id)}
                          className="flex items-center text-slate-500 hover:text-teal-700 transition-colors"
                        >
                          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                          </svg>
                          <span>{post.likes}</span>
                        </button>
                        
                        <button 
                          onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}
                          className="flex items-center text-slate-500 hover:text-teal-700 transition-colors"
                        >
                          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                          </svg>
                          <span>{post.comments.length} Comments</span>
                        </button>
                      </div>
                      
                      {selectedPost === post.id && (
                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <h4 className="text-lg font-semibold text-slate-900 mb-3">Comments</h4>
                          
                          {post.comments.length === 0 ? (
                            <p className="text-slate-500 text-center py-4">No comments yet. Be the first to respond!</p>
                          ) : (
                            <div className="space-y-4 mb-4">
                              {post.comments.map(comment => (
                                <div key={comment.id} className="bg-slate-50 rounded-2xl p-4">
                                  <div className="flex items-center mb-2">
                                    <img 
                                      src={comment.author.avatar} 
                                      alt={comment.author.name} 
                                      className="w-8 h-8 rounded-full mr-2"
                                    />
                                    <div>
                                      <h5 className="text-sm font-medium text-slate-900">{comment.author.name}</h5>
                                      <p className="text-xs text-slate-500">{formatDate(comment.createdAt)}</p>
                                    </div>
                                  </div>
                                  <p className="text-slate-700 mb-2">{comment.content}</p>
                                  <button 
                                    onClick={() => handleLikeComment(post.id, comment.id)}
                                    className="flex items-center text-slate-500 hover:text-teal-700 transition-colors text-xs"
                                  >
                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"></path>
                                    </svg>
                                    <span>{comment.likes}</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-start gap-3">
                            <img 
                              src={user?.avatar || `https://ui-avatars.com/api/?name=Anushka+Kiran+Om&background=0D8ABC&color=fff`} 
                              alt="Your avatar" 
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1">
                              <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="block w-full px-4 py-2 border border-slate-200 rounded-2xl focus:ring-teal-500 focus:border-teal-500"
                                rows="2"
                                placeholder="Write a comment..."
                              ></textarea>
                              <div className="flex justify-end mt-2">
                                <button
                                  onClick={() => handleAddComment(post.id)}
                                  className="bg-teal-700 text-white px-4 py-1 rounded-2xl hover:bg-teal-800 transition-colors text-sm"
                                >
                                  Comment
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Community; 