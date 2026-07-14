package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// SocialLink represents a social media link
type SocialLink struct {
	URL  string `json:"url"`
	Name string `json:"name"`
}

// User represents a user in the git server system
type User struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Username    string    `json:"username" gorm:"uniqueIndex;not null;size:255"`
	Email       string    `json:"email" gorm:"uniqueIndex;not null;size:255"`
	OIDCSubject string    `json:"-" gorm:"column:oidc_subject;uniqueIndex:idx_oidc_subject_issuer;size:255"` // OIDC subject (sub claim)
	OIDCIssuer  string    `json:"-" gorm:"column:oidc_issuer;uniqueIndex:idx_oidc_subject_issuer;size:255"` // OIDC issuer URL
	IsAdmin     bool      `json:"is_admin" gorm:"default:false"`

	// Profile fields
	DisplayName string `json:"display_name" gorm:"size:255"`
	Bio         string `json:"bio" gorm:"size:500"`
	Company     string `json:"company" gorm:"size:255"`
	Location    string `json:"location" gorm:"size:255"`
	Website     string `json:"website" gorm:"size:500"`
	AvatarURL   string `json:"avatar_url" gorm:"size:500"`

	// Linked commit emails (JSON array of strings)
	LinkedEmails string `json:"-" gorm:"type:text;default:'[]'"` // JSON array stored as text

	// Social links (JSON array of SocialLink)
	SocialLinks string `json:"-" gorm:"type:text;default:'[]'"` // JSON array stored as text

	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName returns the table name for the User model
func (User) TableName() string {
	return "users"
}

// GetLinkedEmails returns the linked emails as a slice
func (u *User) GetLinkedEmails() []string {
	if u.LinkedEmails == "" || u.LinkedEmails == "null" {
		return []string{}
	}
	var emails []string
	if err := json.Unmarshal([]byte(u.LinkedEmails), &emails); err != nil {
		return []string{}
	}
	return emails
}

// SetLinkedEmails sets the linked emails from a slice
func (u *User) SetLinkedEmails(emails []string) error {
	data, err := json.Marshal(emails)
	if err != nil {
		return err
	}
	u.LinkedEmails = string(data)
	return nil
}

// GetSocialLinks returns the social links as a slice
func (u *User) GetSocialLinks() []SocialLink {
	if u.SocialLinks == "" || u.SocialLinks == "null" {
		return []SocialLink{}
	}
	var links []SocialLink
	if err := json.Unmarshal([]byte(u.SocialLinks), &links); err != nil {
		return []SocialLink{}
	}
	return links
}

// SetSocialLinks sets the social links from a slice
func (u *User) SetSocialLinks(links []SocialLink) error {
	data, err := json.Marshal(links)
	if err != nil {
		return err
	}
	u.SocialLinks = string(data)
	return nil
}
