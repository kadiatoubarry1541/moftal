// Export de tous les modèles existants
export { default as User } from './User.js';
export { default as Badge } from './Badge.js';
export { default as UserBadge } from './UserBadge.js';
export { default as Formation } from './Formation.js';
export { default as Course } from './Course.js';
export { default as CoursePermission } from './CoursePermission.js';
export { default as Professor } from './Professor.js';
export { default as ProfessorRequest } from './ProfessorRequest.js';
export { default as FormationRegistration } from './FormationRegistration.js';
export { default as Hospital } from './Hospital.js';
export { default as Doctor } from './Doctor.js';
export { default as HealthProduct } from './HealthProduct.js';
export { default as Supplier } from './Supplier.js';
export { default as ExchangeProduct } from './ExchangeProduct.js';
export { default as Order } from './Order.js';
export { default as PlatformCommission } from './PlatformCommission.js';
export { default as FaithContent } from './FaithContent.js';
export { default as FaithCommunity } from './FaithCommunity.js';
export { default as HolyBook } from './HolyBook.js';
export { default as PoorPerson } from './PoorPerson.js';
export { default as OrganizationGroup } from './OrganizationGroup.js';
export { default as OrganizationPost } from './OrganizationPost.js';
export { default as SecurityAgent } from './SecurityAgent.js';
export { default as RegionGroup } from './RegionGroup.js';
export { default as RegionMessage } from './RegionMessage.js';
export { default as RegionMessagePermission } from './RegionMessagePermission.js';
export { default as ResidenceGroup } from './ResidenceGroup.js';
export { default as ResidenceMessage } from './ResidenceMessage.js';
export { default as ActivityGroup } from './ActivityGroup.js';
export { default as ActivityMessage } from './ActivityMessage.js';
export { default as Friend } from './Friend.js';
export { default as FriendRequest } from './FriendRequest.js';
export { default as FamilyTreeMessage } from './FamilyTreeMessage.js';
export { default as FamilyTreeConfirmation } from './FamilyTreeConfirmation.js';
export { default as ParentChildLink } from './ParentChildLink.js';
export { default as ParentChildActivity } from './ParentChildActivity.js';
export { default as ParentChildRating } from './ParentChildRating.js';
export { default as CoupleLink } from './CoupleLink.js';
export { default as FamilyCoreEntry } from './FamilyCoreEntry.js';
export { default as PartnerRating } from './PartnerRating.js';
export { default as CoupleActivity } from './CoupleActivity.js';
export { default as DeceasedMember } from './DeceasedMember.js';
export { default as Document } from './Document.js';
export { default as DocumentPermission } from './DocumentPermission.js';
export { default as DocumentValidation } from './DocumentValidation.js';
export { default as PageAdmin } from './PageAdmin.js';
export { default as Game } from './Game.js';
export { default as GamePlayer } from './GamePlayer.js';
export { default as GameQuestion } from './GameQuestion.js';
export { default as GameAnswer } from './GameAnswer.js';
export { default as GameDeposit } from './GameDeposit.js';
export { default as GameTransaction } from './GameTransaction.js';
export { default as SciencePost } from './SciencePost.js';
export { default as SciencePermission } from './SciencePermission.js';
export { default as RealityPost } from './RealityPost.js';
export { default as StateMessage } from './StateMessage.js';
export { default as Logo } from './Logo.js';
export { default as UserLogo } from './UserLogo.js';
export { default as PublishedStory } from './PublishedStory.js';
export { default as School } from './School.js';
export { default as ProfessionalAccount } from './ProfessionalAccount.js';
export { default as Appointment } from './Appointment.js';
export { default as Notification } from './Notification.js';
export { default as IaKnowledge } from './IaKnowledge.js';
export { default as IaConversation } from './IaConversation.js';
export { default as Payment } from './Payment.js';

// Export des modèles supplémentaires (DB principale)
export * from './additional.js';

// HistorySection est exporté par additional.js (base principale enfants_adam_eve)
// HistorySection.js pointe sur database_temps.js → maintenant aussi enfants_adam_eve


