'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Mail, 
  Phone, 
  Key, 
  Palette,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  EyeOff,
  Shield,
  Info,
} from 'lucide-react'

// Color mapping with actual Tailwind classes (not dynamic)
const staffColors = [
  { name: 'Ocean', value: 'blue', bgClass: 'bg-blue-500', bgLightClass: 'bg-blue-100', textClass: 'text-blue-600', ringClass: 'ring-blue-200', borderClass: 'border-blue-200', hoverBgClass: 'hover:bg-blue-600' },
  { name: 'Forest', value: 'green', bgClass: 'bg-green-500', bgLightClass: 'bg-green-100', textClass: 'text-green-600', ringClass: 'ring-green-200', borderClass: 'border-green-200', hoverBgClass: 'hover:bg-green-600' },
  { name: 'Lavender', value: 'purple', bgClass: 'bg-purple-500', bgLightClass: 'bg-purple-100', textClass: 'text-purple-600', ringClass: 'ring-purple-200', borderClass: 'border-purple-200', hoverBgClass: 'hover:bg-purple-600' },
  { name: 'Mint', value: 'teal', bgClass: 'bg-teal-500', bgLightClass: 'bg-teal-100', textClass: 'text-teal-600', ringClass: 'ring-teal-200', borderClass: 'border-teal-200', hoverBgClass: 'hover:bg-teal-600' },
  { name: 'Sunshine', value: 'yellow', bgClass: 'bg-yellow-500', bgLightClass: 'bg-yellow-100', textClass: 'text-yellow-600', ringClass: 'ring-yellow-200', borderClass: 'border-yellow-200', hoverBgClass: 'hover:bg-yellow-600' },
  { name: 'Blossom', value: 'pink', bgClass: 'bg-pink-500', bgLightClass: 'bg-pink-100', textClass: 'text-pink-600', ringClass: 'ring-pink-200', borderClass: 'border-pink-200', hoverBgClass: 'hover:bg-pink-600' },
  { name: 'Twilight', value: 'indigo', bgClass: 'bg-indigo-500', bgLightClass: 'bg-indigo-100', textClass: 'text-indigo-600', ringClass: 'ring-indigo-200', borderClass: 'border-indigo-200', hoverBgClass: 'hover:bg-indigo-600' },
  { name: 'Coral', value: 'orange', bgClass: 'bg-orange-500', bgLightClass: 'bg-orange-100', textClass: 'text-orange-600', ringClass: 'ring-orange-200', borderClass: 'border-orange-200', hoverBgClass: 'hover:bg-orange-600' },
  { name: 'Sky', value: 'cyan', bgClass: 'bg-cyan-500', bgLightClass: 'bg-cyan-100', textClass: 'text-cyan-600', ringClass: 'ring-cyan-200', borderClass: 'border-cyan-200', hoverBgClass: 'hover:bg-cyan-600' },
  { name: 'Ruby', value: 'red', bgClass: 'bg-red-500', bgLightClass: 'bg-red-100', textClass: 'text-red-600', ringClass: 'ring-red-200', borderClass: 'border-red-200', hoverBgClass: 'hover:bg-red-600' },
  { name: 'Rose', value: 'rose', bgClass: 'bg-rose-500', bgLightClass: 'bg-rose-100', textClass: 'text-rose-600', ringClass: 'ring-rose-200', borderClass: 'border-rose-200', hoverBgClass: 'hover:bg-rose-600' },
  { name: 'Amber', value: 'amber', bgClass: 'bg-amber-500', bgLightClass: 'bg-amber-100', textClass: 'text-amber-600', ringClass: 'ring-amber-200', borderClass: 'border-amber-200', hoverBgClass: 'hover:bg-amber-600' },
  { name: 'Lime', value: 'lime', bgClass: 'bg-lime-500', bgLightClass: 'bg-lime-100', textClass: 'text-lime-600', ringClass: 'ring-lime-200', borderClass: 'border-lime-200', hoverBgClass: 'hover:bg-lime-600' },
  { name: 'Emerald', value: 'emerald', bgClass: 'bg-emerald-500', bgLightClass: 'bg-emerald-100', textClass: 'text-emerald-600', ringClass: 'ring-emerald-200', borderClass: 'border-emerald-200', hoverBgClass: 'hover:bg-emerald-600' },
  { name: 'Violet', value: 'violet', bgClass: 'bg-violet-500', bgLightClass: 'bg-violet-100', textClass: 'text-violet-600', ringClass: 'ring-violet-200', borderClass: 'border-violet-200', hoverBgClass: 'hover:bg-violet-600' },
]

// Helper function to get color object by value
const getColorByValue = (value: string) => {
  return staffColors.find(c => c.value === value) || staffColors[0]
}

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingColors, setLoadingColors] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [usedColors, setUsedColors] = useState<string[]>([])
  const [touchedFields, setTouchedFields] = useState({
    name: false,
    phone: false,
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  })

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    color: 'blue',
  })

  const [errors, setErrors] = useState({
    name: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    hasNumber: false,
    hasLetter: false,
    notSameAsCurrent: false,
  })

  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    fetchUserProfile(parsedUser.id)
    fetchUsedColors(parsedUser.id)
  }, [router])

  useEffect(() => {
    const newPwd = passwordData.newPassword
    const currentPwd = passwordData.currentPassword

    setPasswordChecks({
      length: newPwd.length >= 6,
      hasNumber: /\d/.test(newPwd),
      hasLetter: /[a-zA-Z]/.test(newPwd),
      notSameAsCurrent: newPwd !== currentPwd && currentPwd !== '',
    })

    const newErrors = { ...errors }

    if (touchedFields.newPassword) {
      if (newPwd && newPwd === currentPwd) {
        newErrors.newPassword = 'New password must be different from your current password'
      } else if (newPwd && newPwd.length < 6) {
        newErrors.newPassword = 'Password is too short - minimum 6 characters'
      } else if (newPwd && !/\d/.test(newPwd)) {
        newErrors.newPassword = 'Add at least one number (0-9)'
      } else if (newPwd && !/[a-zA-Z]/.test(newPwd)) {
        newErrors.newPassword = 'Include at least one letter (A-Z or a-z)'
      } else {
        newErrors.newPassword = ''
      }
    }

    if (touchedFields.confirmPassword) {
      if (passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword) {
        newErrors.confirmPassword = 'These passwords don\'t match. Please try again.'
      } else {
        newErrors.confirmPassword = ''
      }
    }

    if (touchedFields.currentPassword && !passwordData.currentPassword) {
        newErrors.currentPassword = 'Current password is required'
    }

    setErrors(newErrors)
  }, [passwordData, touchedFields])

  useEffect(() => {
    const newErrors = { ...errors }

    if (touchedFields.name) {
      if (!profileData.name) {
        newErrors.name = 'Please enter your full name'
      } else if (profileData.name.length < 2) {
        newErrors.name = 'Name must be at least 2 characters'
      } else {
        newErrors.name = ''
      }
    }

    if (touchedFields.phone && profileData.phone) {
      if (!/^[0-9+\-\s()]+$/.test(profileData.phone)) {
        newErrors.phone = 'Phone number contains invalid characters'
      } else if (profileData.phone.replace(/\D/g, '').length < 8) {
        newErrors.phone = 'Please enter at least 8 digits'
      } else {
        newErrors.phone = ''
      }
    } else if (touchedFields.phone && !profileData.phone) {
      newErrors.phone = ''
    }

    setErrors(newErrors)
  }, [profileData, touchedFields])

  useEffect(() => {
    if (!loadingColors && user && (!profileData.color || profileData.color === 'blue')) {
      const availableColor = staffColors.find(c => !usedColors.includes(c.value))
      if (availableColor) {
        setProfileData(prev => ({ ...prev, color: availableColor.value }))
      }
    }
  }, [loadingColors, usedColors, user])

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error

      setProfileData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        color: data.color || 'blue',
      })

    } catch (error) {
      console.error('Error fetching profile:', error)
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsedColors = async (currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('color')
        .neq('id', currentUserId)
        .not('color', 'is', null)

      if (error) throw error

      const colors = data.map(user => user.color).filter(Boolean)
      setUsedColors(colors)
    } catch (error) {
      console.error('Error fetching used colors:', error)
    } finally {
      setLoadingColors(false)
    }
  }

  const isColorAvailable = (colorValue: string) => {
    if (colorValue === profileData.color) return true
    return !usedColors.includes(colorValue)
  }

  const getAvailableColorsCount = () => {
    return staffColors.filter(c => !usedColors.includes(c.value) || c.value === profileData.color).length
  }

  const handleSaveProfile = async () => {
    setTouchedFields(prev => ({ ...prev, name: true, phone: true }))

    if (!profileData.name) {
      toast({ 
        title: "Name required", 
        description: "Please enter your full name", 
        variant: "destructive" 
      })
      return
    }
    
    if (profileData.phone && errors.phone) {
      toast({ 
        title: "Invalid phone number", 
        description: errors.phone, 
        variant: "destructive" 
      })
      return
    }

    if (!isColorAvailable(profileData.color)) {
      toast({ 
        title: "Color not available", 
        description: "This color has been taken by another staff. Please choose another color.", 
        variant: "destructive" 
      })
      return
    }

    setSaving(true)
    setSaveSuccess(false)
    setSaveError(false)

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: profileData.name,
          phone: profileData.phone,
          color: profileData.color,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      const updatedUser = { ...user, name: profileData.name }
      localStorage.setItem('user', JSON.stringify(updatedUser))

      await fetchUsedColors(user.id)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      toast({ 
        title: "Success!", 
        description: "Profile updated successfully" 
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      setSaveError(true)
      setTimeout(() => setSaveError(false), 3000)
      toast({ 
        title: "Error", 
        description: "Failed to update profile", 
        variant: "destructive" 
      })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setTouchedFields(prev => ({ 
      ...prev, 
      currentPassword: true, 
      newPassword: true, 
      confirmPassword: true 
    }))

    if (!passwordData.currentPassword) {
      toast({ 
        title: "Current password required", 
        description: "Please enter your current password", 
        variant: "destructive" 
      })
      return
    }
    if (!passwordData.newPassword) {
      toast({ 
        title: "New password required", 
        description: "Please enter a new password", 
        variant: "destructive" 
      })
      return
    }
    if (!passwordData.confirmPassword) {
      toast({ 
        title: "Please confirm your password", 
        description: "Re-enter your new password", 
        variant: "destructive" 
      })
      return
    }
    if (!passwordChecks.length || !passwordChecks.hasNumber || !passwordChecks.hasLetter) {
      toast({ 
        title: "Password requirements", 
        description: "Password must be 6+ chars with letters and numbers", 
        variant: "destructive" 
      })
      return
    }
    if (passwordData.newPassword === passwordData.currentPassword) {
      toast({ 
        title: "Password not changed", 
        description: "New password must be different", 
        variant: "destructive" 
      })
      return
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ 
        title: "Passwords don't match", 
        description: "New password and confirmation do not match", 
        variant: "destructive" 
      })
      return
    }

    setSaving(true)
    try {
      const { data: userData, error: verifyError } = await supabase
        .from('users')
        .select('password')
        .eq('id', user.id)
        .eq('password', passwordData.currentPassword)
        .single()

      if (verifyError || !userData) {
        setErrors(prev => ({ ...prev, currentPassword: 'Current password is incorrect' }))
        toast({ 
          title: "Incorrect password", 
          description: "The current password you entered is wrong", 
          variant: "destructive" 
        })
        return
      }

      const { error } = await supabase
        .from('users')
        .update({ password: passwordData.newPassword })
        .eq('id', user.id)

      if (error) throw error

      toast({ 
        title: "Password changed!", 
        description: "Your password has been updated successfully" 
      })
      
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTouchedFields({ 
        name: false, 
        phone: false, 
        currentPassword: false, 
        newPassword: false, 
        confirmPassword: false 
      })
      setErrors({ 
        name: '', 
        phone: '', 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
      })

    } catch (error) {
      console.error('Error changing password:', error)
      toast({ 
        title: "Error", 
        description: "Failed to change password", 
        variant: "destructive" 
      })
    } finally {
      setSaving(false)
    }
  }

  const isPasswordButtonDisabled = () => {
    return saving ||
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword ||
      !passwordChecks.length ||
      !passwordChecks.hasNumber ||
      !passwordChecks.hasLetter ||
      !passwordChecks.notSameAsCurrent ||
      passwordData.newPassword !== passwordData.confirmPassword
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const currentColor = getColorByValue(profileData.color)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
          <p className="text-gray-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
          </div>
          <div className="flex items-center gap-3">
            {!loadingColors && (
              <div className="flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-200">
                <Palette className="h-5 w-5" />
                <span className="font-medium">
                  {getAvailableColorsCount()}/15 colors available
                </span>
              </div>
            )}
            {saveSuccess && (
              <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Changes saved!</span>
              </div>
            )}
            {saveError && (
              <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-200">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Failed to save</span>
              </div>
            )}
          </div>
        </div>

        {/* Profile Overview Card */}
        <Card className="mb-8 border shadow-sm">
          <CardContent className="px-6 py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
              <div className="relative group">
                <div className={`w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-bold ${currentColor.bgClass} shadow-md ring-4 ring-white transition-colors duration-300`}>
                  {getInitials(profileData.name)}
                </div>
                <div className={`absolute -bottom-2 -right-2 bg-white ${currentColor.textClass} text-xs font-semibold px-3 py-1.5 rounded-full shadow border border-gray-200`}>
                  {user?.role === 'admin' ? 'Admin' : 'Staff'}
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{profileData.name || 'User'}</h2>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2 text-gray-600">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{profileData.email}</span>
                  </div>
                  {profileData.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{profileData.phone}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
                <div className={`w-3 h-3 rounded-full ${currentColor.bgClass} transition-colors duration-300`} />
                <span className="text-sm text-gray-600">Color: <span className={`font-medium ${currentColor.textClass}`}>{currentColor.name}</span></span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-gray-200 p-1 shadow-sm w-full rounded-2xl">
            <TabsTrigger value="general" className="flex items-center px-6 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <User className="h-4 w-4 mr-2" />General
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center px-6 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Shield className="h-4 w-4 mr-2" />Security
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center px-6 py-2.5 rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Palette className="h-4 w-4 mr-2" />Appearance
            </TabsTrigger>
          </TabsList>

          {/* ========== GENERAL TAB ========== */}
          <TabsContent value="general">
            <Card className="border shadow-sm">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                <CardTitle>General Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Avatar Preview */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold ${currentColor.bgClass} shadow-md ring-4 ${currentColor.ringClass}`}>
                      {getInitials(profileData.name)}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-medium text-gray-900 mb-2">Profile Picture</h3>
                      <p className="text-sm text-gray-600">Auto-generated from your initials and color.</p>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700 font-medium">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        value={profileData.name}
                        onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                        onBlur={() => setTouchedFields({...touchedFields, name: true})}
                        className={`pl-10 ${touchedFields.name && errors.name ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'}`}
                        placeholder="Enter your full name"
                      />
                      {touchedFields.name && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {errors.name ? <XCircle className="h-4 w-4 text-red-500" /> : profileData.name && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </div>
                      )}
                    </div>
                    {touchedFields.name && errors.name && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />{errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input 
                        id="email" 
                        type="email" 
                        value={profileData.email} 
                        disabled 
                        className="pl-10 bg-gray-50 border-gray-200 cursor-not-allowed" 
                      />
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Info className="h-3 w-3" />Email cannot be changed.
                    </p>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-700 font-medium">Phone Number (Optional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        onBlur={() => setTouchedFields({...touchedFields, phone: true})}
                        className={`pl-10 ${touchedFields.phone && errors.phone ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'}`}
                        placeholder="e.g., +60 12-345 6789"
                      />
                      {touchedFields.phone && profileData.phone && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {errors.phone ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        </div>
                      )}
                    </div>
                    {touchedFields.phone && errors.phone && (
                      <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />{errors.phone}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-100 bg-gray-50/50 pt-6">
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={saving || (touchedFields.name && !!errors.name) || (touchedFields.phone && !!errors.phone)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl disabled:opacity-50"
                >
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* ========== SECURITY TAB ========== */}
          <TabsContent value="security">
            <Card className="border shadow-sm">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Change your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="currentPassword" className="text-gray-700 font-medium">Current Password</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      onBlur={() => setTouchedFields({...touchedFields, currentPassword: true})}
                      className={`pl-10 pr-10 ${touchedFields.currentPassword && errors.currentPassword ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'}`}
                      placeholder="Enter current password"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {touchedFields.currentPassword && errors.currentPassword && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />{errors.currentPassword}
                    </p>
                  )}
                </div>

                <Separator />

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-gray-700 font-medium">New Password</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      onBlur={() => setTouchedFields({...touchedFields, newPassword: true})}
                      className={`pl-10 pr-10 ${touchedFields.newPassword && errors.newPassword ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'}`}
                      placeholder="Enter new password"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowNewPassword(!showNewPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {touchedFields.newPassword && errors.newPassword && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" />{errors.newPassword}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm New Password</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) => {
                        setPasswordData({...passwordData, confirmPassword: e.target.value})
                        if (errors.confirmPassword) setErrors({...errors, confirmPassword: ''})
                      }}
                      onBlur={() => setTouchedFields({...touchedFields, confirmPassword: true})}
                      className={`pl-10 pr-10 ${touchedFields.confirmPassword && errors.confirmPassword ? 'border-red-500 ring-2 ring-red-100' : 'border-gray-200'}`}
                      placeholder="Confirm new password"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {passwordData.confirmPassword && (
                      <div className="absolute right-12 top-1/2 -translate-y-1/2">
                        {passwordData.newPassword === passwordData.confirmPassword ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {touchedFields.confirmPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1 animate-in fade-in">
                      <AlertCircle className="h-3 w-3" />
                      These passwords don't match. Please try again.
                    </p>
                  )}
                  {touchedFields.confirmPassword && passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && passwordData.newPassword !== '' && (
                    <p className="text-xs text-green-600 flex items-center gap-1 mt-1 animate-in fade-in">
                      <CheckCircle2 className="h-3 w-3" />
                      Passwords match!
                    </p>
                  )}
                </div>

                {/* Password Requirements Checklist */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <p className="font-medium text-gray-900 mb-3">Password requirements:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: 'At least 6 characters', check: passwordChecks.length },
                      { label: 'Contains at least 1 number', check: passwordChecks.hasNumber },
                      { label: 'Contains at least 1 letter', check: passwordChecks.hasLetter },
                      { label: 'Different from current', check: passwordChecks.notSameAsCurrent }
                    ].map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {req.check ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        <span className={req.check ? 'text-green-600' : 'text-gray-500'}>{req.label}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm sm:col-span-2">
                      {passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword !== '' ? 
                        <CheckCircle2 className="h-4 w-4 text-green-500" /> : 
                        <XCircle className="h-4 w-4 text-red-500" />
                      }
                      <span className={passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword !== '' ? 'text-green-600' : 'text-gray-500'}>
                        Passwords match
                      </span>
                    </div>
                  </div>
                </div>

                {/* Password Strength Meter */}
                {touchedFields.newPassword && passwordData.newPassword && (
                  <div className="space-y-2 animate-in fade-in">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Password strength:</span>
                      <span className={`font-medium ${passwordChecks.length && passwordChecks.hasNumber && passwordChecks.hasLetter ? 'text-green-600' : 'text-yellow-600'}`}>
                        {passwordChecks.length && passwordChecks.hasNumber && passwordChecks.hasLetter ? 'Strong' : 'Weak'}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${passwordChecks.length && passwordChecks.hasNumber && passwordChecks.hasLetter ? 'bg-green-500' : 'bg-yellow-500'}`}
                        style={{ width: `${[passwordChecks.length, passwordChecks.hasNumber, passwordChecks.hasLetter, passwordChecks.notSameAsCurrent].filter(Boolean).length * 25}%` }} 
                      />
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t border-gray-100 bg-gray-50/50 pt-6">
                <Button 
                  onClick={handleChangePassword} 
                  disabled={isPasswordButtonDisabled()} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl disabled:opacity-50"
                >
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : <><Key className="h-4 w-4 mr-2" />Change Password</>}
                </Button>
                {isPasswordButtonDisabled() && (touchedFields.newPassword || touchedFields.confirmPassword) && (
                  <p className="text-xs text-red-500 ml-4 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {!passwordData.currentPassword && 'Enter current password • '}
                    {!passwordChecks.length && 'Too short • '}
                    {!passwordChecks.hasNumber && 'Need number • '}
                    {!passwordChecks.hasLetter && 'Need letter • '}
                    {!passwordChecks.notSameAsCurrent && 'Same as current • '}
                    {passwordData.newPassword !== passwordData.confirmPassword && "Passwords don't match"}
                  </p>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          {/* ========== APPEARANCE TAB ========== */}
          <TabsContent value="appearance">
            <Card className="border shadow-sm">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>Customize your profile appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 pt-6">
                {/* Staff Color */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-700 font-medium text-lg">Your Color</Label>
                    <p className="text-sm text-gray-500 mt-1">
                      This color identifies you across the system - in your profile, tasks, and events. 
                      <span className="font-medium text-blue-600"> Each staff has a unique color.</span>
                    </p>
                  </div>
                  
                  {loadingColors ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-5 sm:grid-cols-15 gap-3">
                        {staffColors.map((color) => {
                          const isAvailable = isColorAvailable(color.value)
                          const isCurrentColor = profileData.color === color.value
                          
                          return (
                            <button
                              key={color.value}
                              type="button"
                              onClick={() => {
                                if (isAvailable) {
                                  setProfileData({...profileData, color: color.value})
                                }
                              }}
                              disabled={!isAvailable && !isCurrentColor}
                              className={`
                                aspect-square rounded-xl ${color.bgClass} relative
                                ${isCurrentColor ? 'ring-4 ring-offset-2 ring-blue-400 scale-110' : ''}
                                ${!isAvailable && !isCurrentColor ? 'opacity-30 cursor-not-allowed filter grayscale' : 'hover:scale-105 cursor-pointer'}
                                transition-all duration-200 shadow
                              `}
                              title={`${color.name}${!isAvailable && !isCurrentColor ? ' (Taken)' : ''}`}
                            >
                              {!isAvailable && !isCurrentColor && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <XCircle className="h-4 w-4 text-white drop-shadow-md" />
                                </div>
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Legend / Status */}
                      <div className="flex flex-wrap items-center gap-4 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-green-500" />
                          <span className="text-gray-600">
                            Available ({staffColors.filter(c => !usedColors.includes(c.value)).length})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-gray-300" />
                          <span className="text-gray-600">
                            Taken by other staff ({usedColors.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${currentColor.bgClass} ring-4 ${currentColor.ringClass}`} />
                          <span className="text-gray-600">Your current color</span>
                        </div>
                      </div>

                      {/* Warning if colors running low */}
                      {getAvailableColorsCount() === 1 && profileData.color && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-yellow-800">Only 1 color left!</h4>
                            <p className="text-sm text-yellow-700">
                              You're the last staff with an available color. Other colors have been taken.
                            </p>
                          </div>
                        </div>
                      )}

                      {/* No colors available warning */}
                      {getAvailableColorsCount() === 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-red-800">No colors available!</h4>
                            <p className="text-sm text-red-700">
                              All colors have been taken. Please contact admin to reassign colors.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Live Preview */}
                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                  <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-500" />Live Preview
                  </h3>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ${currentColor.bgClass} shadow-md ring-4 ${currentColor.ringClass} transition-colors duration-300`}>
                      {getInitials(profileData.name)}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <p className="font-medium text-gray-900">{profileData.name || 'Your Name'}</p>
                      <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                        <div className={`w-3 h-3 rounded-full ${currentColor.bgClass}`} />
                        <p className="text-sm text-gray-600">
                          Your <span className="font-medium">profile, tasks, and events</span> will appear in{' '}
                          <span className={`font-medium ${currentColor.textClass}`}>{currentColor.name}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Example cards */}
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`${currentColor.bgLightClass} border ${currentColor.borderClass} rounded-lg p-3`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentColor.bgClass}`} />
                        <span className={`text-xs font-medium ${currentColor.textClass}`}>Task</span>
                      </div>
                      <p className={`text-sm ${currentColor.textClass} mt-1`}>Complete project report</p>
                    </div>
                    <div className={`${currentColor.bgLightClass} border ${currentColor.borderClass} rounded-lg p-3`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentColor.bgClass}`} />
                        <span className={`text-xs font-medium ${currentColor.textClass}`}>Event</span>
                      </div>
                      <p className={`text-sm ${currentColor.textClass} mt-1`}>Team meeting at 2 PM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-gray-100 bg-gray-50/50 pt-6">
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={saving} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl"
                >
                  {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Palette className="h-4 w-4 mr-2" />Save Appearance</>}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}