const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const {
      name,
      collegeName,
      currentCGPA,
      currentYear,
      branch,
      hobbies,
      achievements,
      subjects,
    } = req.body;

    // Use findByIdAndUpdate for more reliable updating
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        name,
        profile: {
          collegeName,
          currentCGPA,
          currentYear,
          branch,
          hobbies,
          achievements,
          subjects,
        },
      },
      { 
        new: true,  // Return the updated document
        runValidators: true  // Run the validators
      }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(400).json({
      status: 'error',
      message: error.message,
    });
  }
};