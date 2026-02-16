import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  Heart, 
  Send,
  Search,
  Plus,
  Image,
  UserPlus,
  UserCheck,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import apiClient from '../../services/httpService';
import type { CommunityPost, User } from '../../types/community';

interface PostCardProps {
  post: CommunityPost;
  onLike: (postId: number) => void;
  onComment: (postId: number, comment: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment }) => {
  const { userProfile: user } = useAppContext();
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onComment(post.id, newComment.trim());
      setNewComment('');
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Post Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
            {post.author.username.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="font-semibold text-gray-900">{post.author.username}</h3>
            <p className="text-sm text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()} • {post.author.level || 'Athlete'}
            </p>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Post Content */}
      <div className="p-4">
        <p className="text-gray-800 mb-3">{post.content}</p>
        
        {post.mediaUrl && (
          <div className="mb-3">
            <img 
              src={post.mediaUrl} 
              alt="Post content" 
              className="rounded-lg w-full h-64 object-cover"
            />
          </div>
        )}

        {/* Post Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => onLike(post.id)}
              className={`flex items-center space-x-1 ${
                post.likedByUser ? 'text-red-500' : 'text-gray-500 hover:text-red-500'
              }`}
            >
              <Heart className={`w-5 h-5 ${post.likedByUser ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{post.likesCount}</span>
            </button>
            
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-1 text-gray-500 hover:text-blue-500"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">{post.commentsCount}</span>
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            {post.visibility}
          </div>
        </div>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-gray-100 bg-gray-50">
          {/* Existing Comments */}
          <div className="p-4 space-y-3 max-h-60 overflow-y-auto">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment) => (
                <div key={comment.id} className="flex">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex-shrink-0"></div>
                  <div className="ml-2 flex-1">
                    <div className="bg-white rounded-lg p-3">
                      <div className="flex items-center mb-1">
                        <span className="font-medium text-sm text-gray-900">
                          {comment.author?.username || 'User'}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No comments yet. Be the first!</p>
            )}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleCommentSubmit} className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-white border border-gray-300 rounded-full py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="ml-2 p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </motion.div>
  );
};

export const CommunityHub: React.FC = () => {
  const { userProfile: user } = useAppContext();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [feedRes, followingRes, followersRes] = await Promise.all([
        apiClient.get(`/phase9/community/feed/${user!.id}?limit=20`),
        apiClient.get(`/phase9/community/users/${user!.id}/following`),
        apiClient.get(`/phase9/community/users/${user!.id}/followers`)
      ]);

      setPosts(feedRes.data.data);
      setFollowing(followingRes.data.data);
      setFollowers(followersRes.data.data);
    } catch (err) {
      setError('Failed to load community data');
      console.error('Error fetching community data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    try {
      await apiClient.post(`/phase9/community/posts/${user!.id}`, {
        content: newPostContent,
        mediaUrl: null
      });
      
      setNewPostContent('');
      fetchData(); // Refresh feed
    } catch (err) {
      console.error('Error creating post:', err);
      alert('Failed to create post');
    }
  };

  const handleLikePost = async (postId: number) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (post?.likedByUser) {
        await apiClient.delete(`/phase9/community/posts/${user!.id}/${postId}/unlike`);
      } else {
        await apiClient.post(`/phase9/community/posts/${user!.id}/${postId}/like`);
      }
      fetchData(); // Refresh feed
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleComment = async (postId: number, comment: string) => {
    try {
      // Assuming there's an endpoint for adding comments
      await apiClient.post(`/phase9/community/posts/${postId}/comments`, {
        userId: user!.id,
        content: comment
      });
      fetchData(); // Refresh feed
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleFollowUser = async (targetUserId: number) => {
    try {
      await apiClient.post(`/phase9/community/users/${user!.id}/follow/${targetUserId}`);
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Error following user:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Hub</h1>
        <p className="text-gray-600">Connect with fellow athletes and share your journey</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - User Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                {(user?.username || user?.name)?.charAt(0).toUpperCase() || 'U'}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{user?.username || user?.name}</h2>
              <p className="text-gray-600">Fitness Enthusiast</p>
              
              <div className="flex justify-center space-x-6 mt-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{following.length}</div>
                  <div className="text-sm text-gray-500">Following</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">{followers.length}</div>
                  <div className="text-sm text-gray-500">Followers</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                <UserPlus className="w-5 h-5 text-blue-500 mr-3" />
                <span>Find Athletes</span>
              </button>
              <button className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                <TrendingUp className="w-5 h-5 text-green-500 mr-3" />
                <span>Trending Topics</span>
              </button>
              <button className="w-full flex items-center p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
                <Calendar className="w-5 h-5 text-purple-500 mr-3" />
                <span>Events</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Main Content - Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Create Post */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <form onSubmit={handleCreatePost}>
              <div className="flex">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
                <div className="ml-3 flex-1">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Share your fitness journey..."
                    className="w-full border-0 focus:ring-0 resize-none min-h-[100px] text-gray-800 placeholder-gray-500"
                  />
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex space-x-2">
                      <button type="button" className="p-2 text-gray-500 hover:text-blue-500 rounded-full hover:bg-gray-100">
                        <Image className="w-5 h-5" />
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!newPostContent.trim()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Posts Feed */}
          <div className="space-y-6">
            {posts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
                <p className="text-gray-500">Be the first to share your fitness journey!</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLikePost}
                  onComment={handleComment}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Sidebar - Suggestions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Search */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search athletes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </motion.div>

          {/* Who to Follow */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Who to Follow</h3>
            <div className="space-y-4">
              {[1, 2, 3].map((id) => (
                <div key={id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">Athlete {id}</p>
                      <p className="text-sm text-gray-500">Fitness enthusiast</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFollowUser(id)}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded-full hover:bg-blue-600"
                  >
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Trending */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          >
            <h3 className="font-semibold text-gray-900 mb-4">Trending Topics</h3>
            <div className="space-y-2">
              {['#FitnessMotivation', '#WorkoutWednesday', '#HealthyLifestyle'].map((topic, index) => (
                <div key={topic} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-blue-500 font-medium">{topic}</span>
                  <span className="text-xs text-gray-500">#{index + 1}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};