import { User } from './user.model';

export class UserService {
  static async getUserById(id: string) {
    // passwordHash has select: false by default in the model, but we can be explicit
    return User.findById(id).select('-passwordHash');
  }

  static async updateUser(id: string, updates: { name?: string }) {
    // Only allow updating the name. Other fields should be stripped/rejected at the controller/validation layer.
    return User.findByIdAndUpdate(
      id,
      { $set: { name: updates.name } },
      { new: true, runValidators: true }
    ).select('-passwordHash');
  }

  static async listUsers(filters: { role?: string }) {
    const query: any = {};
    if (filters.role) {
      query.role = filters.role;
    }
    return User.find(query).select('-passwordHash');
  }
}
